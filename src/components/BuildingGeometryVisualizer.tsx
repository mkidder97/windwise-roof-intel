import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BuildingDimensions {
  length: number;
  width: number;
  height: number;
  // L-shape specific
  length1?: number;
  width1?: number;
  length2?: number;
  width2?: number;
}

interface ZoneData {
  type: 'field' | 'perimeter' | 'corner';
  area: number;
  boundaries: Array<{x: number; y: number}>;
  pressureCoefficient: number;
  pressure?: number;
  description: string;
}

interface BuildingGeometryVisualizerProps {
  buildingShape: 'rectangle' | 'l_shape' | 'complex';
  dimensions: BuildingDimensions;
  zones?: ZoneData[];
  pressures?: {
    field: number;
    perimeter: number;
    corner: number;
  };
  className?: string;
  showPressures?: boolean;
  interactive?: boolean;
}

export const BuildingGeometryVisualizer: React.FC<BuildingGeometryVisualizerProps> = ({
  buildingShape,
  dimensions,
  zones = [],
  pressures,
  className = "",
  showPressures = true,
  interactive = true
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [showZoneOverlay, setShowZoneOverlay] = useState(true);
  const [viewMode, setViewMode] = useState<'pressure' | 'area'>('pressure');
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();

  // Calculate viewport and scaling
  const margin = 40;
  const maxDimension = Math.max(dimensions.length, dimensions.width);
  const scale = Math.min(400, 300) / maxDimension * zoom;
  const viewBoxWidth = 500;
  const viewBoxHeight = 400;

  // Color schemes for pressure visualization
  const getPressureColor = (pressure: number, maxPressure: number): string => {
    const intensity = pressure / maxPressure;
    if (intensity < 0.3) return '#22c55e'; // Green - low pressure
    if (intensity < 0.7) return '#f59e0b'; // Yellow - medium pressure
    return '#ef4444'; // Red - high pressure
  };

  const getZoneColor = (zone: ZoneData): string => {
    if (!showPressures || !pressures) {
      // Default zone colors
      switch (zone.type) {
        case 'field': return '#e0f2fe';
        case 'perimeter': return '#bbf7d0';
        case 'corner': return '#fef3c7';
        default: return '#f3f4f6';
      }
    }

    const maxPressure = Math.max(pressures.field, pressures.perimeter, pressures.corner);
    const zonePressure = zone.pressure || pressures[zone.type];
    return getPressureColor(zonePressure, maxPressure);
  };

  // Convert building coordinates to SVG coordinates
  const toSVG = (x: number, y: number) => ({
    x: viewBoxWidth / 2 + (x - dimensions.length / 2) * scale + pan.x,
    y: viewBoxHeight / 2 + (y - dimensions.width / 2) * scale + pan.y
  });

  // Generate building outline based on shape
  const generateBuildingOutline = (): string => {
    if (buildingShape === 'rectangle') {
      const topLeft = toSVG(0, 0);
      const topRight = toSVG(dimensions.length, 0);
      const bottomRight = toSVG(dimensions.length, dimensions.width);
      const bottomLeft = toSVG(0, dimensions.width);
      
      return `M ${topLeft.x} ${topLeft.y} L ${topRight.x} ${topRight.y} L ${bottomRight.x} ${bottomRight.y} L ${bottomLeft.x} ${bottomLeft.y} Z`;
    }
    
    if (buildingShape === 'l_shape') {
      const { length1 = dimensions.length, width1 = dimensions.width, 
              length2 = dimensions.length * 0.6, width2 = dimensions.width * 0.6 } = dimensions;
      
      // L-shape outline
      const points = [
        toSVG(0, 0),
        toSVG(length1, 0),
        toSVG(length1, width1),
        toSVG(length1 + length2, width1),
        toSVG(length1 + length2, width1 + width2),
        toSVG(0, width1 + width2),
      ];
      
      return `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
    }
    
    // Default to rectangle for complex shapes
    return generateBuildingOutline();
  };

  // Generate zone overlays
  const generateZoneOverlays = () => {
    if (!showZoneOverlay || zones.length === 0) return null;

    return zones.map((zone, index) => {
      const svgBoundaries = zone.boundaries.map(point => toSVG(point.x, point.y));
      const pathData = `M ${svgBoundaries.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
      
      return (
        <g key={index}>
          <path
            d={pathData}
            fill={getZoneColor(zone)}
            fillOpacity={0.6}
            stroke={selectedZone === index ? '#1f2937' : '#9ca3af'}
            strokeWidth={selectedZone === index ? 2 : 1}
            className={interactive ? 'cursor-pointer hover:fill-opacity-80 transition-all' : ''}
            onClick={() => interactive && setSelectedZone(selectedZone === index ? null : index)}
          />
          {/* Zone label */}
          {svgBoundaries.length > 0 && (
            <text
              x={svgBoundaries.reduce((sum, p) => sum + p.x, 0) / svgBoundaries.length}
              y={svgBoundaries.reduce((sum, p) => sum + p.y, 0) / svgBoundaries.length}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
              className="pointer-events-none select-none"
            >
              {zone.type.charAt(0).toUpperCase()}
            </text>
          )}
        </g>
      );
    });
  };

  // Handle pan and zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !interactive) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.2 : 0.8;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * factor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedZone(null);
  };

  const exportSVG = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'building-geometry.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "Building geometry exported as SVG",
    });
  };

  return (
    <Card className={`p-4 ${className}`}>
      {/* Controls */}
      {interactive && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('in')}
              disabled={zoom >= 5}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('out')}
              disabled={zoom <= 0.1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowZoneOverlay(!showZoneOverlay)}
            >
              {showZoneOverlay ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Zoom: {(zoom * 100).toFixed(0)}%
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={exportSVG}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* SVG Visualization */}
      <div className="relative bg-gray-50 rounded-lg overflow-hidden border">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className={`w-full h-96 ${interactive ? 'cursor-move' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid pattern */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Zone overlays (rendered first, behind building outline) */}
          {generateZoneOverlays()}
          
          {/* Building outline */}
          <path
            d={generateBuildingOutline()}
            fill="none"
            stroke="#1f2937"
            strokeWidth="2"
          />
          
          {/* Dimension labels */}
          <g className="dimension-labels">
            {/* Length dimension */}
            <text
              x={viewBoxWidth / 2}
              y={viewBoxHeight / 2 - dimensions.width * scale / 2 - 20}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
              className="select-none"
            >
              {dimensions.length}'
            </text>
            
            {/* Width dimension */}
            <text
              x={viewBoxWidth / 2 + dimensions.length * scale / 2 + 20}
              y={viewBoxHeight / 2}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
              className="select-none"
              transform={`rotate(90, ${viewBoxWidth / 2 + dimensions.length * scale / 2 + 20}, ${viewBoxHeight / 2})`}
            >
              {dimensions.width}'
            </text>
          </g>
          
          {/* North arrow */}
          <g transform={`translate(${viewBoxWidth - 60}, 40)`}>
            <path d="M 0 -20 L 5 -5 L 0 0 L -5 -5 Z" fill="#374151" />
            <text x="0" y="15" textAnchor="middle" fontSize="10" fill="#6b7280">N</text>
          </g>
        </svg>
        
        {/* Scale indicator */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-600">
          Scale: 1" = {(maxDimension / 400).toFixed(1)}'
        </div>
      </div>

      {/* Zone Details Panel */}
      {selectedZone !== null && zones[selectedZone] && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Zone Details</h4>
          <div className="space-y-1 text-sm">
            <div>Type: <span className="font-medium">{zones[selectedZone].type}</span></div>
            <div>Area: <span className="font-medium">{zones[selectedZone].area.toFixed(1)} ft²</span></div>
            <div>Description: <span className="font-medium">{zones[selectedZone].description}</span></div>
            {pressures && (
              <div>Pressure: <span className="font-medium">
                {(zones[selectedZone].pressure || pressures[zones[selectedZone].type]).toFixed(1)} psf
              </span></div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {showZoneOverlay && zones.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Zone Legend</h4>
          <div className="flex flex-wrap gap-3 text-xs">
            {['field', 'perimeter', 'corner'].map(zoneType => {
              const zone = zones.find(z => z.type === zoneType);
              if (!zone) return null;
              
              return (
                <div key={zoneType} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded border"
                    style={{ backgroundColor: getZoneColor(zone) }}
                  />
                  <span className="capitalize">{zoneType}</span>
                  {pressures && (
                    <span className="text-gray-500">
                      ({pressures[zoneType as keyof typeof pressures].toFixed(1)} psf)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default BuildingGeometryVisualizer;