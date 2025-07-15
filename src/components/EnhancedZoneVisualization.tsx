import React, { useState } from 'react';
import { Building2, Wind, Eye, EyeOff, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PressureZone {
  id: string;
  type: 'field' | 'perimeter' | 'corner' | 'field_prime' | 'perimeter_prime' | 'corner_prime';
  name: string;
  gcp: number;
  area: number;
  netPressure: number;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isZone1Prime: boolean;
  description: string;
}

interface Zone1PrimeAnalysis {
  isRequired: boolean;
  aspectRatio: number;
  pressureIncrease: number;
  explanation: string;
}

interface EnhancedZoneVisualizationProps {
  buildingLength: number;
  buildingWidth: number;
  buildingHeight: number;
  zones: PressureZone[];
  zone1PrimeAnalysis: Zone1PrimeAnalysis | null;
  className?: string;
}

export function EnhancedZoneVisualization({
  buildingLength,
  buildingWidth,
  buildingHeight,
  zones,
  zone1PrimeAnalysis,
  className = ""
}: EnhancedZoneVisualizationProps) {
  
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showPressureValues, setShowPressureValues] = useState(true);
  const [view, setView] = useState<'standard' | 'zone1prime'>('zone1prime');

  const getZoneColor = (zone: PressureZone, isSelected: boolean) => {
    if (isSelected) return 'fill-blue-500 fill-opacity-80 stroke-blue-700 stroke-2';
    
    if (zone.isZone1Prime) {
      if (zone.type.includes('corner')) return 'fill-red-400 fill-opacity-60 stroke-red-600 stroke-1';
      if (zone.type.includes('perimeter')) return 'fill-orange-400 fill-opacity-60 stroke-orange-600 stroke-1';
      return 'fill-yellow-400 fill-opacity-60 stroke-yellow-600 stroke-1';
    }
    
    // Standard zones
    if (zone.type.includes('corner')) return 'fill-gray-400 fill-opacity-40 stroke-gray-600 stroke-1';
    if (zone.type.includes('perimeter')) return 'fill-gray-300 fill-opacity-40 stroke-gray-500 stroke-1';
    return 'fill-gray-200 fill-opacity-40 stroke-gray-400 stroke-1';
  };

  const getZonePriority = (zone: PressureZone) => {
    if (zone.type.includes('corner')) return 3;
    if (zone.type.includes('perimeter')) return 2;
    return 1;
  };

  // Sort zones by priority for rendering order
  const sortedZones = [...zones].sort((a, b) => getZonePriority(a) - getZonePriority(b));

  // Calculate scale for the visualization
  const maxDimension = Math.max(buildingLength, buildingWidth);
  const svgSize = 400;
  const scale = (svgSize * 0.8) / maxDimension;
  const scaledLength = buildingLength * scale;
  const scaledWidth = buildingWidth * scale;
  const offsetX = (svgSize - scaledLength) / 2;
  const offsetY = (svgSize - scaledWidth) / 2;

  const zone1PrimeZones = zones.filter(z => z.isZone1Prime);
  const standardZones = zones.filter(z => !z.isZone1Prime);

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Enhanced Zone Visualization</span>
                {zone1PrimeAnalysis?.isRequired && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Zone 1' Active
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPressureValues(!showPressureValues)}
                >
                  {showPressureValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Building Visualization */}
              <div className="flex justify-center">
                <div className="relative">
                  <svg 
                    width={svgSize} 
                    height={svgSize} 
                    viewBox={`0 0 ${svgSize} ${svgSize}`}
                    className="border rounded-lg shadow-sm bg-gray-50"
                  >
                    {/* Building outline */}
                    <rect
                      x={offsetX}
                      y={offsetY}
                      width={scaledLength}
                      height={scaledWidth}
                      fill="none"
                      stroke="rgb(75, 85, 99)"
                      strokeWidth="2"
                    />

                    {/* Wind direction indicator */}
                    <defs>
                      <marker id="arrowhead-enhanced" markerWidth="10" markerHeight="7" 
                              refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="rgb(59, 130, 246)" />
                      </marker>
                    </defs>
                    <g>
                      <line
                        x1={offsetX - 40}
                        y1={offsetY - 20}
                        x2={offsetX - 10}
                        y2={offsetY - 20}
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead-enhanced)"
                      />
                      <text
                        x={offsetX - 60}
                        y={offsetY - 15}
                        fontSize="12"
                        fill="rgb(59, 130, 246)"
                        textAnchor="middle"
                      >
                        Wind
                      </text>
                    </g>

                    {/* Pressure zones */}
                    {sortedZones.map((zone) => {
                      const zoneX = offsetX + (zone.location.x * scale);
                      const zoneY = offsetY + (zone.location.y * scale);
                      const zoneWidth = zone.location.width * scale;
                      const zoneHeight = zone.location.height * scale;
                      const isSelected = selectedZone === zone.id;

                      return (
                        <g key={zone.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <rect
                                x={zoneX}
                                y={zoneY}
                                width={zoneWidth}
                                height={zoneHeight}
                                className={`cursor-pointer transition-all duration-200 hover:fill-opacity-80 ${getZoneColor(zone, isSelected)}`}
                                onClick={() => setSelectedZone(isSelected ? null : zone.id)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-medium">{zone.name}</p>
                                <p className="text-sm">GCp: {zone.gcp}</p>
                                <p className="text-sm">Net Pressure: {zone.netPressure.toFixed(1)} psf</p>
                                <p className="text-sm">Area: {zone.area.toFixed(0)} sq ft</p>
                                {zone.isZone1Prime && (
                                  <p className="text-xs text-orange-600 font-medium">Zone 1' Enhanced</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>

                          {/* Pressure value labels */}
                          {showPressureValues && zoneWidth > 40 && zoneHeight > 30 && (
                            <text
                              x={zoneX + zoneWidth / 2}
                              y={zoneY + zoneHeight / 2}
                              fontSize="10"
                              fill={zone.isZone1Prime ? "rgb(154, 52, 18)" : "rgb(55, 65, 81)"}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="font-medium"
                            >
                              {zone.netPressure.toFixed(1)}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Dimension labels */}
                    <text 
                      x={offsetX + scaledLength / 2} 
                      y={offsetY + scaledWidth + 20} 
                      fontSize="12" 
                      textAnchor="middle" 
                      fill="rgb(107, 114, 128)"
                    >
                      {buildingLength}' × {buildingWidth}' × {buildingHeight}'
                    </text>
                  </svg>
                </div>
              </div>

              {/* Zone Statistics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-lg font-bold text-gray-900">{zones.length}</p>
                  <p className="text-xs text-gray-600">Total Zones</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded">
                  <p className="text-lg font-bold text-orange-900">{zone1PrimeZones.length}</p>
                  <p className="text-xs text-orange-600">Zone 1' Areas</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <p className="text-lg font-bold text-red-900">
                    {Math.max(...zones.map(z => z.netPressure)).toFixed(1)}
                  </p>
                  <p className="text-xs text-red-600">Max Pressure (psf)</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded">
                  <p className="text-lg font-bold text-blue-900">
                    {zone1PrimeAnalysis?.pressureIncrease || 0}%
                  </p>
                  <p className="text-xs text-blue-600">Pressure Increase</p>
                </div>
              </div>

              {/* Zone Details Panel */}
              {selectedZone && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {(() => {
                    const zone = zones.find(z => z.id === selectedZone);
                    if (!zone) return null;
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-blue-900">{zone.name}</h4>
                          {zone.isZone1Prime && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              Zone 1' Enhanced
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Pressure Coefficient:</strong> {zone.gcp}</p>
                            <p><strong>Net Pressure:</strong> {zone.netPressure.toFixed(1)} psf</p>
                          </div>
                          <div>
                            <p><strong>Zone Area:</strong> {zone.area.toFixed(0)} sq ft</p>
                            <p><strong>Zone Type:</strong> {zone.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <p className="text-sm text-blue-800">{zone.description}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Legend */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Legend</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-3 bg-red-400 bg-opacity-60 border border-red-600 rounded"></div>
                    <span>Zone 1' Corner</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-3 bg-orange-400 bg-opacity-60 border border-orange-600 rounded"></div>
                    <span>Zone 1' Perimeter</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-3 bg-gray-400 bg-opacity-40 border border-gray-600 rounded"></div>
                    <span>Standard Corner</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-3 bg-gray-300 bg-opacity-40 border border-gray-500 rounded"></div>
                    <span>Standard Perimeter</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-3 bg-gray-200 bg-opacity-40 border border-gray-400 rounded"></div>
                    <span>Field Zone</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wind className="h-3 w-3 text-blue-500" />
                    <span>Wind Direction</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}