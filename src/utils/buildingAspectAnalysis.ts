/**
 * Building Aspect Analysis for Professional Wind Engineering
 * Analyzes building geometry for wind load implications
 */

export interface BuildingGeometry {
  length: number;
  width: number;
  height: number;
  area: number;
  perimeter: number;
  aspectRatio: number;
  heightRatio: number;
  classification: BuildingClassification;
}

export interface BuildingClassification {
  type: 'compact' | 'elongated' | 'highly_elongated' | 'tower';
  description: string;
  windImplications: string[];
  designConsiderations: string[];
  asceReferences: string[];
}

export interface AspectAnalysisResults {
  geometry: BuildingGeometry;
  windVulnerability: WindVulnerabilityAssessment;
  recommendations: string[];
  professionalWarnings: string[];
  confidence: number;
}

export interface WindVulnerabilityAssessment {
  overallRisk: 'low' | 'moderate' | 'high' | 'extreme';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  additionalAnalysisRequired: boolean;
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  impact: string;
  mitigation: string;
}

/**
 * Perform comprehensive building aspect analysis
 */
export function analyzeBuildingAspect(
  buildingLength: number,
  buildingWidth: number,
  buildingHeight: number,
  exposureCategory: string = 'C'
): AspectAnalysisResults {
  
  // Calculate basic geometry
  const area = buildingLength * buildingWidth;
  const perimeter = 2 * (buildingLength + buildingWidth);
  const aspectRatio = Math.max(buildingLength / buildingWidth, buildingWidth / buildingLength);
  const acrossWindDimension = Math.min(buildingLength, buildingWidth);
  const heightRatio = buildingHeight / acrossWindDimension;

  // Classify building type
  const classification = classifyBuilding(aspectRatio, heightRatio, buildingHeight);

  const geometry: BuildingGeometry = {
    length: buildingLength,
    width: buildingWidth,
    height: buildingHeight,
    area,
    perimeter,
    aspectRatio,
    heightRatio,
    classification
  };

  // Assess wind vulnerability
  const windVulnerability = assessWindVulnerability(geometry, exposureCategory);

  // Generate recommendations
  const recommendations = generateRecommendations(geometry, windVulnerability);

  // Generate professional warnings
  const professionalWarnings = generateProfessionalWarnings(geometry, windVulnerability);

  // Calculate confidence level
  const confidence = calculateAnalysisConfidence(geometry, exposureCategory);

  return {
    geometry,
    windVulnerability,
    recommendations,
    professionalWarnings,
    confidence
  };
}

/**
 * Classify building based on geometry
 */
function classifyBuilding(aspectRatio: number, heightRatio: number, height: number): BuildingClassification {
  
  if (heightRatio >= 5.0 || height >= 300) {
    return {
      type: 'tower',
      description: 'High-rise tower building',
      windImplications: [
        'Vortex shedding potential',
        'Galloping and flutter susceptibility',
        'Dynamic wind effects dominant',
        'Acceleration response critical'
      ],
      designConsiderations: [
        'Wind tunnel testing recommended',
        'Dynamic analysis required',
        'Comfort criteria evaluation needed',
        'Detailed facade pressure analysis'
      ],
      asceReferences: [
        'ASCE 7-22 Chapter 27 - Wind Tunnel Procedure',
        'ASCE 7-22 Section 26.5.3 - Dynamic Response'
      ]
    };
  }

  if (aspectRatio >= 4.0) {
    return {
      type: 'highly_elongated',
      description: 'Highly elongated low-rise building',
      windImplications: [
        'Severe corner wind acceleration',
        'Zone 1\' pressures mandatory',
        'End wall vortex formation',
        'Crosswind galloping potential'
      ],
      designConsiderations: [
        'Zone 1\' pressure coefficients required',
        'Enhanced corner fastening needed',
        'End wall reinforcement critical',
        'Consideration of wind tunnel testing'
      ],
      asceReferences: [
        'ASCE 7-22 Figure 26.11-1A (Zone 1\')',
        'ASCE 7-22 Section 26.11.1'
      ]
    };
  }

  if (aspectRatio >= 2.0) {
    return {
      type: 'elongated',
      description: 'Elongated low-rise building',
      windImplications: [
        'Corner wind acceleration',
        'Zone 1\' pressures likely required',
        'Flow reattachment along sides',
        'Increased corner suction'
      ],
      designConsiderations: [
        'Evaluate Zone 1\' requirements',
        'Enhanced corner detailing',
        'Careful pressure coefficient selection',
        'Consider building orientation'
      ],
      asceReferences: [
        'ASCE 7-22 Figure 26.11-1A',
        'ASCE 7-22 Section 26.11'
      ]
    };
  }

  return {
    type: 'compact',
    description: 'Compact rectangular building',
    windImplications: [
      'Standard wind flow patterns',
      'Predictable pressure distribution',
      'Well-understood aerodynamics',
      'Standard zone definitions apply'
    ],
    designConsiderations: [
      'Standard ASCE 7 procedures applicable',
      'Normal pressure coefficients',
      'Straightforward zone layout',
      'Conventional fastening patterns'
    ],
    asceReferences: [
      'ASCE 7-22 Figure 26.11-1',
      'ASCE 7-22 Section 26.11'
    ]
  };
}

/**
 * Assess wind vulnerability based on building characteristics
 */
function assessWindVulnerability(
  geometry: BuildingGeometry,
  exposureCategory: string
): WindVulnerabilityAssessment {
  
  const riskFactors: RiskFactor[] = [];

  // Aspect ratio risk
  if (geometry.aspectRatio >= 4.0) {
    riskFactors.push({
      factor: 'Extreme Aspect Ratio',
      severity: 'critical',
      description: `Building is ${geometry.aspectRatio.toFixed(1)} times longer than wide`,
      impact: 'Severe corner pressure amplification and potential dynamic effects',
      mitigation: 'Wind tunnel testing, enhanced fastening, structural analysis'
    });
  } else if (geometry.aspectRatio >= 2.5) {
    riskFactors.push({
      factor: 'High Aspect Ratio',
      severity: 'high',
      description: `Building is ${geometry.aspectRatio.toFixed(1)} times longer than wide`,
      impact: 'Significant corner pressure increase requiring Zone 1\' analysis',
      mitigation: 'Apply Zone 1\' pressure coefficients and enhanced corner design'
    });
  } else if (geometry.aspectRatio >= 2.0) {
    riskFactors.push({
      factor: 'Moderate Aspect Ratio',
      severity: 'moderate',
      description: `Building is ${geometry.aspectRatio.toFixed(1)} times longer than wide`,
      impact: 'Corner pressure enhancement likely required',
      mitigation: 'Evaluate Zone 1\' requirements case by case'
    });
  }

  // Height ratio risk
  if (geometry.heightRatio >= 2.0) {
    riskFactors.push({
      factor: 'High Height-to-Width Ratio',
      severity: 'high',
      description: `Building height is ${geometry.heightRatio.toFixed(1)} times the across-wind dimension`,
      impact: 'Enhanced wind effects and potential dynamic response',
      mitigation: 'Consider dynamic analysis and enhanced design factors'
    });
  } else if (geometry.heightRatio >= 1.0) {
    riskFactors.push({
      factor: 'Moderate Height-to-Width Ratio',
      severity: 'moderate',
      description: `Building height equals or exceeds across-wind dimension`,
      impact: 'Amplified corner effects and flow complexity',
      mitigation: 'Apply enhanced pressure coefficients'
    });
  }

  // Exposure category impact
  if ((exposureCategory === 'D' || exposureCategory === 'C') && geometry.aspectRatio >= 2.0) {
    riskFactors.push({
      factor: 'Open Terrain Exposure',
      severity: 'moderate',
      description: `Exposure Category ${exposureCategory} amplifies elongated building effects`,
      impact: 'Increased wind speeds and less turbulence dampening',
      mitigation: 'Apply exposure-enhanced pressure coefficients'
    });
  }

  // Overall risk assessment
  let overallRisk: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
  const criticalFactors = riskFactors.filter(f => f.severity === 'critical').length;
  const highFactors = riskFactors.filter(f => f.severity === 'high').length;
  const moderateFactors = riskFactors.filter(f => f.severity === 'moderate').length;

  if (criticalFactors > 0) overallRisk = 'extreme';
  else if (highFactors >= 2) overallRisk = 'extreme';
  else if (highFactors >= 1) overallRisk = 'high';
  else if (moderateFactors >= 2) overallRisk = 'high';
  else if (moderateFactors >= 1) overallRisk = 'moderate';

  // Determine if additional analysis is required
  const additionalAnalysisRequired = overallRisk === 'extreme' || 
    (overallRisk === 'high' && geometry.aspectRatio >= 3.0) ||
    geometry.heightRatio >= 2.0;

  // Generate mitigation strategies
  const mitigationStrategies = generateMitigationStrategies(riskFactors, geometry);

  return {
    overallRisk,
    riskFactors,
    mitigationStrategies,
    additionalAnalysisRequired
  };
}

/**
 * Generate mitigation strategies based on risk factors
 */
function generateMitigationStrategies(riskFactors: RiskFactor[], geometry: BuildingGeometry): string[] {
  const strategies: string[] = [];

  if (geometry.aspectRatio >= 4.0) {
    strategies.push('Recommend wind tunnel testing for pressure coefficient validation');
    strategies.push('Implement enhanced corner fastening with 25-30% pressure increase');
    strategies.push('Consider building segmentation to reduce effective aspect ratio');
  } else if (geometry.aspectRatio >= 2.0) {
    strategies.push('Apply Zone 1\' pressure coefficients per ASCE 7-22 Figure 26.11-1A');
    strategies.push('Increase corner zone fastening density by 20-25%');
    strategies.push('Verify edge metal and coping attachment adequacy');
  }

  if (geometry.heightRatio >= 1.5) {
    strategies.push('Consider dynamic wind effects in structural analysis');
    strategies.push('Evaluate resonance potential and damping requirements');
    strategies.push('Increase design factors for tall building effects');
  }

  const hasCriticalRisk = riskFactors.some(f => f.severity === 'critical');
  if (hasCriticalRisk) {
    strategies.push('Engage wind engineering specialist for detailed analysis');
    strategies.push('Document all assumptions and limitations clearly');
    strategies.push('Consider peer review of wind load calculations');
  }

  return strategies;
}

/**
 * Generate professional warnings for engineers
 */
function generateProfessionalWarnings(
  geometry: BuildingGeometry,
  vulnerability: WindVulnerabilityAssessment
): string[] {
  const warnings: string[] = [];

  if (vulnerability.overallRisk === 'extreme') {
    warnings.push('CRITICAL: Building geometry creates extreme wind vulnerability - specialist consultation required');
  }

  if (geometry.aspectRatio >= 4.0) {
    warnings.push('WARNING: Aspect ratio exceeds typical design guidance - wind tunnel testing recommended');
  }

  if (geometry.heightRatio >= 2.0) {
    warnings.push('WARNING: High height-to-width ratio may require dynamic analysis');
  }

  if (vulnerability.additionalAnalysisRequired) {
    warnings.push('NOTICE: Additional wind analysis beyond ASCE 7 simplified procedures may be required');
  }

  if (geometry.classification.type === 'highly_elongated') {
    warnings.push('NOTICE: Zone 1\' pressure coefficients are mandatory for this building geometry');
  }

  return warnings;
}

/**
 * Generate design recommendations
 */
function generateRecommendations(
  geometry: BuildingGeometry,
  vulnerability: WindVulnerabilityAssessment
): string[] {
  const recommendations: string[] = [];

  // Basic geometry recommendations
  recommendations.push(`Building classified as: ${geometry.classification.description}`);
  recommendations.push(`Aspect ratio: ${geometry.aspectRatio.toFixed(1)}:1 (${geometry.length}' × ${geometry.width}')`);
  recommendations.push(`Height ratio: ${geometry.heightRatio.toFixed(1)}:1 (h/D = ${geometry.height}'/${Math.min(geometry.length, geometry.width)}')`);

  // Risk-based recommendations
  if (vulnerability.overallRisk === 'low') {
    recommendations.push('Standard ASCE 7-22 procedures are appropriate for this building geometry');
  } else {
    recommendations.push(`Wind vulnerability: ${vulnerability.overallRisk.toUpperCase()} - enhanced design required`);
  }

  // Specific technical recommendations
  vulnerability.mitigationStrategies.forEach(strategy => {
    recommendations.push(strategy);
  });

  return recommendations;
}

/**
 * Calculate confidence level in the analysis
 */
function calculateAnalysisConfidence(geometry: BuildingGeometry, exposureCategory: string): number {
  let confidence = 95;

  // Reduce confidence for extreme geometries
  if (geometry.aspectRatio >= 5.0) confidence -= 20;
  else if (geometry.aspectRatio >= 4.0) confidence -= 15;
  else if (geometry.aspectRatio >= 3.0) confidence -= 10;

  if (geometry.heightRatio >= 3.0) confidence -= 15;
  else if (geometry.heightRatio >= 2.0) confidence -= 10;

  // Exposure category impact
  if (exposureCategory === 'D' && geometry.aspectRatio >= 3.0) confidence -= 5;

  return Math.max(confidence, 70); // Minimum 70% confidence
}