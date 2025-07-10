import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ScrapingRequest {
  manufacturer_id?: string;
  test_mode?: boolean;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { manufacturer_id, test_mode = false }: ScrapingRequest = await req.json().catch(() => ({}));
    
    console.log('Starting manufacturer data scraping', { manufacturer_id, test_mode });

    // Get manufacturer monitoring configurations
    let query = supabase.from('manufacturer_monitoring').select('*');
    
    if (manufacturer_id) {
      query = query.eq('id', manufacturer_id);
    } else {
      query = query.eq('status', 'active');
    }

    const { data: configs, error: configError } = await query;
    
    if (configError) {
      throw new Error(`Failed to fetch monitoring configs: ${configError.message}`);
    }

    if (!configs?.length) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No active monitoring configurations found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    for (const config of configs) {
      console.log(`Processing manufacturer: ${config.manufacturer_name}`);
      
      try {
        const scraperResult = await scrapeManufacturerData(config, test_mode);
        results.push({
          manufacturer_id: config.id,
          manufacturer_name: config.manufacturer_name,
          success: true,
          changes_detected: scraperResult.changes.length,
          changes: scraperResult.changes,
          last_scraped: new Date().toISOString()
        });

        // Update last_checked timestamp
        await supabase
          .from('manufacturer_monitoring')
          .update({ 
            last_checked: new Date().toISOString(),
            ...(scraperResult.changes.length > 0 && { last_change_detected: new Date().toISOString() })
          })
          .eq('id', config.id);

        // Log detected changes
        for (const change of scraperResult.changes) {
          await logDetectedChange(config.id, change);
        }

      } catch (error) {
        console.error(`Error scraping ${config.manufacturer_name}:`, error);
        results.push({
          manufacturer_id: config.id,
          manufacturer_name: config.manufacturer_name,
          success: false,
          error: error.message,
          last_scraped: new Date().toISOString()
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      total_processed: configs.length,
      total_changes: results.reduce((sum, r) => sum + (r.changes_detected || 0), 0)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in scrape-manufacturer-data function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function scrapeManufacturerData(config: any, testMode: boolean) {
  const changes = [];
  
  // Get monitoring configuration
  const monitoringConfig = config.monitoring_config;
  const productPages = monitoringConfig.product_pages || [];
  const specSelectors = monitoringConfig.spec_selectors || {};

  console.log(`Scraping ${config.manufacturer_name} with ${productPages.length} pages`);

  for (const pageUrl of productPages) {
    try {
      console.log(`Fetching page: ${pageUrl}`);
      
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const pageChanges = await analyzePageContent(config.manufacturer_name, pageUrl, html, specSelectors, testMode);
      changes.push(...pageChanges);

    } catch (error) {
      console.error(`Error scraping page ${pageUrl}:`, error);
      
      // Log the scraping error
      changes.push({
        change_type: 'scraping_error',
        page_url: pageUrl,
        change_data: { error: error.message },
        change_summary: `Failed to scrape page: ${error.message}`,
        detection_confidence: 0.0
      });
    }
  }

  return { changes };
}

async function analyzePageContent(manufacturerName: string, pageUrl: string, html: string, specSelectors: any, testMode: boolean) {
  const changes = [];

  try {
    // Basic HTML parsing using regex and string methods
    const products = await extractProductsFromHTML(manufacturerName, html, specSelectors);
    
    for (const product of products) {
      // Compare with existing data
      const existingProduct = await findExistingProduct(product);
      
      if (!existingProduct) {
        // New product detected
        changes.push({
          change_type: 'new_product',
          page_url: pageUrl,
          change_data: product,
          previous_data: null,
          change_summary: `New product detected: ${product.product_name}`,
          detection_confidence: 0.85
        });
      } else {
        // Check for specification changes
        const specChanges = compareProductSpecs(existingProduct, product);
        if (specChanges.length > 0) {
          for (const specChange of specChanges) {
            changes.push({
              change_type: 'spec_change',
              page_url: pageUrl,
              change_data: {
                product_name: product.product_name,
                field: specChange.field,
                new_value: specChange.new_value,
                old_value: specChange.old_value
              },
              previous_data: existingProduct,
              change_summary: `${specChange.field} changed from ${specChange.old_value} to ${specChange.new_value}`,
              detection_confidence: 0.90
            });
          }
        }
      }
    }

    // In test mode, generate sample changes
    if (testMode && changes.length === 0) {
      changes.push({
        change_type: 'test_change',
        page_url: pageUrl,
        change_data: { test: true, timestamp: new Date().toISOString() },
        change_summary: `Test scraping completed for ${manufacturerName}`,
        detection_confidence: 1.0
      });
    }

  } catch (error) {
    console.error('Error analyzing page content:', error);
  }

  return changes;
}

async function extractProductsFromHTML(manufacturerName: string, html: string, specSelectors: any) {
  const products = [];

  try {
    // Manufacturer-specific parsing logic
    switch (manufacturerName.toLowerCase()) {
      case 'gaf':
        return extractGAFProducts(html, specSelectors);
      case 'firestone':
        return extractFirestoneProducts(html, specSelectors);
      case 'carlisle syntec':
        return extractCarlisleProducts(html, specSelectors);
      case 'sika sarnafil':
        return extractSikaProducts(html, specSelectors);
      default:
        return extractGenericProducts(html, specSelectors);
    }
  } catch (error) {
    console.error(`Error extracting products for ${manufacturerName}:`, error);
    return [];
  }
}

function extractGAFProducts(html: string, selectors: any) {
  const products = [];
  
  try {
    // Extract product titles
    const titleMatches = html.match(/<h[1-6][^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    
    for (const titleMatch of titleMatches) {
      const productName = titleMatch.replace(/<[^>]+>/g, '').trim();
      
      if (productName && productName.length > 3) {
        // Look for wind rating near the product
        const windRatingMatch = html.match(new RegExp(productName + '[\\s\\S]{0,500}(\\d+)\\s*psf', 'i'));
        const windRating = windRatingMatch ? `${windRatingMatch[1]} psf` : null;
        
        // Look for membrane type
        const membraneMatch = html.match(new RegExp(productName + '[\\s\\S]{0,300}(TPO|EPDM|PVC)', 'i'));
        const membraneType = membraneMatch ? membraneMatch[1] : null;

        products.push({
          product_name: productName,
          wind_rating: windRating,
          membrane_type: membraneType,
          manufacturer: 'GAF'
        });
      }
    }
  } catch (error) {
    console.error('Error extracting GAF products:', error);
  }

  return products;
}

function extractFirestoneProducts(html: string, selectors: any) {
  const products = [];
  
  try {
    // Look for Firestone product patterns
    const productMatches = html.match(/(?:UltraPly|RubberGard|UltraPlus|FireJoint)[^<]*(?:<[^>]*>[^<]*)*(?:\d+\s*psf)?/gi) || [];
    
    for (const match of productMatches) {
      const cleanMatch = match.replace(/<[^>]+>/g, '').trim();
      const windRatingMatch = cleanMatch.match(/(\d+)\s*psf/i);
      
      products.push({
        product_name: cleanMatch.split(/\d+\s*psf/)[0].trim(),
        wind_rating: windRatingMatch ? `${windRatingMatch[1]} psf` : null,
        manufacturer: 'Firestone'
      });
    }
  } catch (error) {
    console.error('Error extracting Firestone products:', error);
  }

  return products;
}

function extractCarlisleProducts(html: string, selectors: any) {
  const products = [];
  
  try {
    // Look for Carlisle product patterns
    const productMatches = html.match(/(?:Sure-Weld|FleeceBACK|RestoTabbed)[^<]*(?:<[^>]*>[^<]*)*(?:\d+\s*psf)?/gi) || [];
    
    for (const match of productMatches) {
      const cleanMatch = match.replace(/<[^>]+>/g, '').trim();
      const windRatingMatch = cleanMatch.match(/(\d+)\s*psf/i);
      
      products.push({
        product_name: cleanMatch.split(/\d+\s*psf/)[0].trim(),
        wind_rating: windRatingMatch ? `${windRatingMatch[1]} psf` : null,
        manufacturer: 'Carlisle SynTec'
      });
    }
  } catch (error) {
    console.error('Error extracting Carlisle products:', error);
  }

  return products;
}

function extractSikaProducts(html: string, selectors: any) {
  const products = [];
  
  try {
    // Look for Sika product patterns
    const productMatches = html.match(/(?:Sarnafil|EnergySmart|Sikaplan)[^<]*(?:<[^>]*>[^<]*)*(?:\d+\s*psf)?/gi) || [];
    
    for (const match of productMatches) {
      const cleanMatch = match.replace(/<[^>]+>/g, '').trim();
      const windRatingMatch = cleanMatch.match(/(\d+)\s*psf/i);
      
      products.push({
        product_name: cleanMatch.split(/\d+\s*psf/)[0].trim(),
        wind_rating: windRatingMatch ? `${windRatingMatch[1]} psf` : null,
        manufacturer: 'Sika Sarnafil'
      });
    }
  } catch (error) {
    console.error('Error extracting Sika products:', error);
  }

  return products;
}

function extractGenericProducts(html: string, selectors: any) {
  const products = [];
  
  try {
    // Generic product extraction
    const productTitleMatches = html.match(/<h[1-6][^>]*>([^<]+(?:TPO|EPDM|PVC)[^<]*)<\/h[1-6]>/gi) || [];
    
    for (const titleMatch of productTitleMatches) {
      const productName = titleMatch.replace(/<[^>]+>/g, '').trim();
      
      if (productName && productName.length > 3) {
        const windRatingMatch = html.match(new RegExp(productName + '[\\s\\S]{0,300}(\\d+)\\s*psf', 'i'));
        
        products.push({
          product_name: productName,
          wind_rating: windRatingMatch ? `${windRatingMatch[1]} psf` : null,
          manufacturer: 'Generic'
        });
      }
    }
  } catch (error) {
    console.error('Error extracting generic products:', error);
  }

  return products;
}

async function findExistingProduct(product: any) {
  try {
    const { data } = await supabase
      .from('roof_systems')
      .select('*')
      .ilike('system_name', `%${product.product_name}%`)
      .eq('manufacturer', product.manufacturer)
      .limit(1)
      .single();
    
    return data;
  } catch (error) {
    return null; // Product not found
  }
}

function compareProductSpecs(existing: any, scraped: any) {
  const changes = [];
  
  // Compare wind rating
  if (existing.max_wind_pressure && scraped.wind_rating) {
    const existingRating = existing.max_wind_pressure.toString();
    const scrapedRating = scraped.wind_rating.replace(/\s*psf/i, '');
    
    if (existingRating !== scrapedRating) {
      changes.push({
        field: 'wind_rating',
        old_value: `${existingRating} psf`,
        new_value: scraped.wind_rating
      });
    }
  }
  
  // Compare membrane type
  if (existing.membrane_type && scraped.membrane_type && 
      existing.membrane_type.toLowerCase() !== scraped.membrane_type.toLowerCase()) {
    changes.push({
      field: 'membrane_type',
      old_value: existing.membrane_type,
      new_value: scraped.membrane_type
    });
  }
  
  return changes;
}

async function logDetectedChange(monitoringId: string, change: any) {
  try {
    await supabase
      .from('change_detection_log')
      .insert({
        monitoring_id: monitoringId,
        change_type: change.change_type,
        change_data: change.change_data,
        previous_data: change.previous_data,
        detection_confidence: change.detection_confidence,
        page_url: change.page_url,
        change_summary: change.change_summary,
        review_status: 'pending'
      });
  } catch (error) {
    console.error('Error logging detected change:', error);
  }
}