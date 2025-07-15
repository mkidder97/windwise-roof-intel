import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Building2, Wind, Calculator, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface Zone1PrimeAnalysis {
  isRequired: boolean;
  aspectRatio: number;
  heightRatio: number;
  pressureIncrease: number;
  explanation: string;
  asceReference: string;
  triggers: Array<{
    type: string;
    triggered: boolean;
    value: number;
    threshold: number;
    description: string;
    impact: string;
  }>;
}

interface Zone1PrimeExplanationProps {
  analysis: Zone1PrimeAnalysis | null;
  buildingLength: number;
  buildingWidth: number;
  className?: string;
}

export function Zone1PrimeExplanation({
  analysis,
  buildingLength,
  buildingWidth,
  className = ""
}: Zone1PrimeExplanationProps) {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'technical' | 'reference'>('overview');

  if (!analysis) {
    return null;
  }

  const triggeredFactors = analysis.triggers?.filter(t => t.triggered) || [];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Explanation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>Zone 1' Explanation</span>
              {analysis.isRequired && (
                <Badge variant="secondary">Enhanced Pressures Required</Badge>
              )}
            </div>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simple Visual Explanation */}
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-12 border-2 border-gray-300 rounded relative bg-gray-50">
                  {/* Simple building diagram */}
                  {analysis.isRequired && (
                    <>
                      <div className="absolute top-0 left-0 w-3 h-3 bg-orange-400 rounded-sm"></div>
                      <div className="absolute top-0 right-0 w-3 h-3 bg-orange-400 rounded-sm"></div>
                    </>
                  )}
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Wind className="h-3 w-3 text-blue-500" />
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed">
                  {analysis.explanation}
                </p>
                {analysis.isRequired && (
                  <p className="text-sm text-orange-600 mt-2 font-medium">
                    ⚠️ Enhanced corner pressures (+{analysis.pressureIncrease}%) required for safety
                  </p>
                )}
              </div>
            </div>

            {/* Key Numbers */}
            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-md">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{buildingLength}' × {buildingWidth}'</p>
                <p className="text-xs text-gray-600">Building Size</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${analysis.isRequired ? 'text-orange-600' : 'text-green-600'}`}>
                  {analysis.aspectRatio.toFixed(1)}:1
                </p>
                <p className="text-xs text-gray-600">Aspect Ratio</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${analysis.isRequired ? 'text-orange-600' : 'text-green-600'}`}>
                  {analysis.isRequired ? `+${analysis.pressureIncrease}%` : 'Standard'}
                </p>
                <p className="text-xs text-gray-600">Pressure Increase</p>
              </div>
            </div>
          </div>

          {/* Expandable Detailed Content */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Section Tabs */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-md">
                <Button
                  variant={activeSection === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('overview')}
                  className="flex-1"
                >
                  Overview
                </Button>
                <Button
                  variant={activeSection === 'technical' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('technical')}
                  className="flex-1"
                >
                  Technical
                </Button>
                <Button
                  variant={activeSection === 'reference' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('reference')}
                  className="flex-1"
                >
                  Reference
                </Button>
              </div>

              {/* Overview Section */}
              {activeSection === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center space-x-1">
                      <Building2 className="h-3 w-3" />
                      <span>Why Zone 1' Matters</span>
                    </h4>
                    <div className="text-sm space-y-2 text-gray-700">
                      <p>
                        Zone 1' (Zone 1 Prime) is a special wind pressure zone required for elongated buildings. 
                        When buildings are much longer than they are wide, wind accelerates around the corners, 
                        creating higher suction forces than standard calculations predict.
                      </p>
                      <p>
                        <strong>Real-world impact:</strong> Without Zone 1' analysis, roof systems may be 
                        under-designed by 20-40%, leading to potential failures during wind storms.
                      </p>
                    </div>
                  </div>

                  {/* Triggered Factors */}
                  {triggeredFactors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Why Zone 1' is Required for This Building:</h4>
                      <div className="space-y-2">
                        {triggeredFactors.map((factor, index) => (
                          <div key={index} className="bg-orange-50 border border-orange-200 rounded p-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{factor.description}</span>
                              <Badge variant="outline" className="text-orange-700">
                                {factor.value.toFixed(1)} {factor.type === 'aspect_ratio' ? ':1' : ''}
                              </Badge>
                            </div>
                            <p className="text-xs text-orange-700 mt-1">{factor.impact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Section */}
              {activeSection === 'technical' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center space-x-1">
                      <Calculator className="h-3 w-3" />
                      <span>Technical Analysis</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="font-medium">Aspect Ratio Calculation</p>
                          <p>L/W = {buildingLength}/{buildingWidth} = {analysis.aspectRatio.toFixed(2)}</p>
                          <p className={analysis.aspectRatio >= 2.0 ? 'text-orange-600' : 'text-green-600'}>
                            Threshold: ≥ 2.0 {analysis.aspectRatio >= 2.0 ? '(EXCEEDED)' : '(OK)'}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="font-medium">Height Ratio Calculation</p>
                          <p>h/D = {analysis.heightRatio.toFixed(2)}</p>
                          <p className={analysis.heightRatio >= 1.0 ? 'text-orange-600' : 'text-green-600'}>
                            Threshold: ≥ 1.0 {analysis.heightRatio >= 1.0 ? '(EXCEEDED)' : '(OK)'}
                          </p>
                        </div>
                      </div>

                      {analysis.isRequired && (
                        <div className="bg-orange-50 p-3 rounded border border-orange-200">
                          <p className="font-medium text-sm text-orange-800 mb-1">Enhanced Pressure Calculation:</p>
                          <p className="text-xs text-orange-700">
                            Standard corner pressure coefficient (GCp): -2.5<br/>
                            Zone 1' corner pressure coefficient (GCp): {(-2.5 * (1 + analysis.pressureIncrease/100)).toFixed(1)}<br/>
                            Pressure increase: +{analysis.pressureIncrease}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Reference Section */}
              {activeSection === 'reference' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">ASCE 7-22 References</h4>
                    <div className="space-y-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <p className="font-medium text-blue-800">Primary Reference:</p>
                        <p className="text-blue-700">{analysis.asceReference}</p>
                      </div>
                      <div className="space-y-1 text-gray-600">
                        <p><strong>Section 26.11.1:</strong> Low-Rise Buildings</p>
                        <p><strong>Figure 26.11-1A:</strong> Zone 1' pressure coefficients for elongated buildings</p>
                        <p><strong>Commentary C26.11:</strong> Additional guidance on Zone 1' application</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Professional Considerations</h4>
                    <div className="text-xs space-y-1 text-gray-600">
                      <p>• Zone 1' analysis is mandatory for buildings with aspect ratios ≥ 2:1</p>
                      <p>• Professional engineer validation recommended for enhanced pressure zones</p>
                      <p>• Enhanced fastening patterns required in Zone 1' areas</p>
                      <p>• Documentation must include Zone 1' methodology and justification</p>
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}