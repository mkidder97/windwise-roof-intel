import React from 'react';
import { Building2, Wind, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BuildingOpening {
  id: string;
  area: number;
  location: 'windward' | 'leeward' | 'side';
  type: 'door' | 'window' | 'vent' | 'garage';
  isGlazed: boolean;
  canFail: boolean;
  x: number; // Position as percentage of wall width
  y: number; // Position as percentage of wall height
  width: number; // Width as percentage of wall width
  height: number; // Height as percentage of wall height
}

interface EnclosureClassification {
  type: 'enclosed' | 'partially_enclosed' | 'open';
  totalWallArea: number;
  totalOpeningArea: number;
  windwardOpeningArea: number;
  percentOpenArea: number;
  GCpi_positive: number;
  GCpi_negative: number;
  reasoning: string[];
  warnings: string[];
}

interface BuildingVisualizationProps {
  buildingLength: number;
  buildingWidth: number;
  buildingHeight: number;
  openings: BuildingOpening[];
  enclosureClass: EnclosureClassification | null;
  windDirection: number; // degrees (0 = north, 90 = east, etc.)
}

export function BuildingVisualization({
  buildingLength,
  buildingWidth,
  buildingHeight,
  openings,
  enclosureClass,
  windDirection = 0
}: BuildingVisualizationProps) {
  
  // Determine windward face based on wind direction
  const getWindwardFace = (direction: number) => {
    const normalized = ((direction % 360) + 360) % 360;
    if (normalized >= 315 || normalized < 45) return 'north';
    if (normalized >= 45 && normalized < 135) return 'east';
    if (normalized >= 135 && normalized < 225) return 'south';
    return 'west';
  };

  const windwardFace = getWindwardFace(windDirection);

  const getOpeningColor = (opening: BuildingOpening, face: string) => {
    const isWindward = (
      (face === 'front' && windwardFace === 'north') ||
      (face === 'right' && windwardFace === 'east') ||
      (face === 'back' && windwardFace === 'south') ||
      (face === 'left' && windwardFace === 'west')
    );

    if (opening.canFail) return 'fill-red-400 stroke-red-600';
    if (isWindward) return 'fill-blue-400 stroke-blue-600';
    return 'fill-gray-400 stroke-gray-600';
  };

  const getFaceOpenings = (face: string) => {
    const faceMapping: Record<string, string> = {
      'front': windwardFace === 'north' ? 'windward' : 'leeward',
      'back': windwardFace === 'south' ? 'windward' : 'leeward',
      'left': windwardFace === 'west' ? 'windward' : 'side',
      'right': windwardFace === 'east' ? 'windward' : 'side'
    };

    return openings.filter(opening => {
      if (face === 'front' && windwardFace === 'north') return opening.location === 'windward';
      if (face === 'back' && windwardFace === 'south') return opening.location === 'windward';
      if (face === 'left' && windwardFace === 'west') return opening.location === 'windward';
      if (face === 'right' && windwardFace === 'east') return opening.location === 'windward';
      if (face === 'front' && windwardFace === 'south') return opening.location === 'leeward';
      if (face === 'back' && windwardFace === 'north') return opening.location === 'leeward';
      return opening.location === 'side';
    });
  };

  const renderWallElevation = (face: string, width: number, height: number) => {
    const faceOpenings = getFaceOpenings(face);
    const scale = 200; // SVG viewport scale
    const wallWidth = scale * 0.8;
    const wallHeight = (wallWidth * height) / width;

    return (
      <div className="flex flex-col items-center space-y-2">
        <h4 className="text-sm font-medium capitalize">
          {face === 'front' ? `${windwardFace} (Windward)` : 
           face === 'back' ? `${windwardFace === 'north' ? 'South' : windwardFace === 'south' ? 'North' : windwardFace === 'east' ? 'West' : 'East'} (Leeward)` :
           face}
        </h4>
        <svg width={scale} height={scale} viewBox={`0 0 ${scale} ${scale}`} className="border rounded">
          {/* Wall outline */}
          <rect
            x={(scale - wallWidth) / 2}
            y={(scale - wallHeight) / 2}
            width={wallWidth}
            height={wallHeight}
            fill="rgb(243, 244, 246)"
            stroke="rgb(107, 114, 128)"
            strokeWidth="2"
          />
          
          {/* Wind direction indicator */}
          {(face === 'front' || face === 'back') && (
            <g>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="rgb(59, 130, 246)" />
                </marker>
              </defs>
              <line
                x1={face === 'front' ? scale * 0.1 : scale * 0.9}
                y1={scale * 0.1}
                x2={face === 'front' ? scale * 0.3 : scale * 0.7}
                y2={scale * 0.1}
                stroke="rgb(59, 130, 246)"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={face === 'front' ? scale * 0.05 : scale * 0.95}
                y={scale * 0.08}
                fontSize="10"
                fill="rgb(59, 130, 246)"
                textAnchor={face === 'front' ? 'start' : 'end'}
              >
                Wind
              </text>
            </g>
          )}
          
          {/* Openings */}
          {faceOpenings.map((opening) => {
            const openingX = (scale - wallWidth) / 2 + (opening.x / 100) * wallWidth;
            const openingY = (scale - wallHeight) / 2 + (opening.y / 100) * wallHeight;
            const openingWidth = (opening.width / 100) * wallWidth;
            const openingHeight = (opening.height / 100) * wallHeight;
            
            return (
              <g key={opening.id}>
                <rect
                  x={openingX}
                  y={openingY}
                  width={openingWidth}
                  height={openingHeight}
                  className={getOpeningColor(opening, face)}
                  strokeWidth="1"
                />
                {opening.canFail && (
                  <text
                    x={openingX + openingWidth / 2}
                    y={openingY + openingHeight / 2}
                    fontSize="8"
                    fill="red"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    ⚠
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        
        {/* Face summary */}
        <div className="text-xs text-center">
          <p>{faceOpenings.length} openings</p>
          <p>{faceOpenings.reduce((sum, o) => sum + o.area, 0).toFixed(0)} sq ft</p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Building Enclosure Visualization</span>
          {enclosureClass && (
            <Badge 
              variant={
                enclosureClass.type === 'enclosed' ? 'default' :
                enclosureClass.type === 'partially_enclosed' ? 'destructive' : 'secondary'
              }
            >
              {enclosureClass.type.replace('_', ' ').toUpperCase()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Building elevations */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {renderWallElevation('front', buildingLength, buildingHeight)}
          {renderWallElevation('right', buildingWidth, buildingHeight)}
          {renderWallElevation('back', buildingLength, buildingHeight)}
          {renderWallElevation('left', buildingWidth, buildingHeight)}
        </div>
        
        {/* Plan view */}
        <div className="flex flex-col items-center space-y-2">
          <h4 className="text-sm font-medium">Plan View</h4>
          <svg width="200" height="140" viewBox="0 0 200 140" className="border rounded">
            {/* Building outline */}
            <rect
              x="50"
              y="30"
              width="100"
              height="80"
              fill="rgb(243, 244, 246)"
              stroke="rgb(107, 114, 128)"
              strokeWidth="2"
            />
            
            {/* Wind direction arrow */}
            <defs>
              <marker id="wind-arrow" markerWidth="8" markerHeight="6" 
                      refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="rgb(59, 130, 246)" />
              </marker>
            </defs>
            
            <g transform={`rotate(${windDirection} 100 70)`}>
              <line
                x1="100"
                y1="10"
                x2="100"
                y2="25"
                stroke="rgb(59, 130, 246)"
                strokeWidth="2"
                markerEnd="url(#wind-arrow)"
              />
              <text
                x="100"
                y="8"
                fontSize="10"
                fill="rgb(59, 130, 246)"
                textAnchor="middle"
              >
                Wind
              </text>
            </g>
            
            {/* Dimension labels */}
            <text x="100" y="125" fontSize="10" textAnchor="middle" fill="rgb(107, 114, 128)">
              {buildingLength}' × {buildingWidth}'
            </text>
          </svg>
        </div>
        
        {/* Enclosure classification details */}
        {enclosureClass && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Total Wall Area</p>
                <p>{enclosureClass.totalWallArea.toFixed(0)} sq ft</p>
              </div>
              <div>
                <p className="font-medium">Total Opening Area</p>
                <p>{enclosureClass.totalOpeningArea.toFixed(0)} sq ft</p>
              </div>
              <div>
                <p className="font-medium">Windward Opening Area</p>
                <p>{enclosureClass.windwardOpeningArea.toFixed(0)} sq ft</p>
              </div>
              <div>
                <p className="font-medium">Percent Open</p>
                <p>{enclosureClass.percentOpenArea.toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Internal Pressure Coefficients</p>
                <p>GCpi: +{enclosureClass.GCpi_positive}, {enclosureClass.GCpi_negative}</p>
              </div>
              <div>
                <p className="font-medium">Classification</p>
                <p className="capitalize">{enclosureClass.type.replace('_', ' ')}</p>
              </div>
            </div>
            
            {enclosureClass.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Warnings:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                      {enclosureClass.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Legend */}
        <div className="border-t pt-3">
          <p className="font-medium text-sm mb-2">Legend:</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-blue-400 border border-blue-600 rounded"></div>
              <span>Windward Opening</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-gray-400 border border-gray-600 rounded"></div>
              <span>Other Opening</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-red-400 border border-red-600 rounded relative">
                <span className="absolute inset-0 flex items-center justify-center text-red-800 text-xs">⚠</span>
              </div>
              <span>Can Fail</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}