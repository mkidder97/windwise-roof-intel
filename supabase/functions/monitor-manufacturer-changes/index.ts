import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MonitoringRequest {
  monitoring_id?: string;
  test_mode?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { monitoring_id, test_mode = false }: MonitoringRequest = await req.json()

    // Get monitoring configurations
    let query = supabase
      .from('manufacturer_monitoring')
      .select('*')
      .eq('status', 'active')

    if (monitoring_id) {
      query = query.eq('id', monitoring_id)
    }

    const { data: configs, error: configError } = await query

    if (configError) throw configError

    const results = []

    for (const config of configs || []) {
      try {
        // Simulate web scraping (in production, this would use actual scraping)
        const mockChanges = await simulateWebScraping(config, test_mode)
        
        if (mockChanges.length > 0) {
          // Log detected changes
          const { data: changeLog, error: logError } = await supabase
            .from('change_detection_log')
            .insert(mockChanges.map(change => ({
              monitoring_id: config.id,
              change_type: change.type,
              change_data: change.data,
              previous_data: change.previous,
              detection_confidence: change.confidence,
              page_url: change.url,
              change_summary: change.summary,
              auto_approved: change.confidence > 0.9 && change.type === 'minor_update'
            })))
            .select()

          if (logError) throw logError

          // Send notifications if not in test mode
          if (!test_mode && config.notification_settings?.email_enabled) {
            await sendChangeNotifications(config, mockChanges)
          }

          results.push({
            monitoring_id: config.id,
            manufacturer: config.manufacturer_name,
            changes_detected: mockChanges.length,
            changes: mockChanges
          })
        }

        // Update last checked timestamp
        await supabase
          .from('manufacturer_monitoring')
          .update({ 
            last_checked: new Date().toISOString(),
            last_change_detected: mockChanges.length > 0 ? new Date().toISOString() : config.last_change_detected
          })
          .eq('id', config.id)

      } catch (error) {
        console.error(`Error monitoring ${config.manufacturer_name}:`, error)
        results.push({
          monitoring_id: config.id,
          manufacturer: config.manufacturer_name,
          error: error.message
        })
      }
    }

    const message = test_mode 
      ? `Test completed. Found ${results.reduce((sum, r) => sum + (r.changes_detected || 0), 0)} potential changes.`
      : `Monitoring check completed for ${configs?.length || 0} manufacturers.`

    return new Response(JSON.stringify({
      success: true,
      message,
      results,
      test_mode
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('Monitoring error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})

async function simulateWebScraping(config: any, testMode: boolean) {
  // In a real implementation, this would:
  // 1. Fetch the manufacturer's web pages
  // 2. Extract product information using the configured selectors
  // 3. Compare with stored baseline data
  // 4. Detect and classify changes

  const changes = []

  // Simulate finding changes for demo purposes
  if (testMode || Math.random() > 0.7) {
    const changeTypes = [
      {
        type: 'spec_change',
        data: { 
          product_name: 'EverGuard TPO System',
          field: 'wind_rating',
          new_value: '165 psf',
          old_value: '150 psf'
        },
        previous: { wind_rating: '150 psf' },
        confidence: 0.95,
        url: config.monitoring_config?.product_pages?.[0] || config.website_url,
        summary: 'Wind rating increased from 150 psf to 165 psf'
      },
      {
        type: 'new_product',
        data: {
          product_name: 'StormGuard Pro TPO',
          wind_rating: '200 psf',
          membrane_type: 'TPO'
        },
        previous: null,
        confidence: 0.88,
        url: config.monitoring_config?.product_pages?.[0] || config.website_url,
        summary: 'New product detected: StormGuard Pro TPO with 200 psf rating'
      }
    ]

    // Randomly select 0-2 changes for simulation
    const numChanges = Math.floor(Math.random() * 3)
    for (let i = 0; i < numChanges; i++) {
      changes.push(changeTypes[Math.floor(Math.random() * changeTypes.length)])
    }
  }

  return changes
}

async function sendChangeNotifications(config: any, changes: any[]) {
  // In production, this would integrate with email service (Resend)
  // For now, we'll just log the notification
  console.log(`Would send email notification to ${config.notification_settings?.email_recipients?.join(', ')} about ${changes.length} changes for ${config.manufacturer_name}`)
  
  // Store notification history
  for (const recipient of config.notification_settings?.email_recipients || []) {
    await supabase
      .from('notification_history')
      .insert({
        change_id: null, // Would link to specific change if implemented
        notification_type: 'email',
        recipient,
        status: 'sent'
      })
  }
}