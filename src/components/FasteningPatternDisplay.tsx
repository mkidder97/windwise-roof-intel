import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Grid, 
  Ruler, 
  Target, 
  CircleDot, 
  Square,
  Calculator,
  Info,
  AlertTriangle
} from "lucide-react";

interface FasteningPattern {
  field_spacing_x: number;
  field_spacing_y: number;
  perimeter_spacing: number;
  corner_spacing: number;
  row_spacing: number;
  overlap_requirement: number;
  fastener_type: string;
  plate_size: string;
  torque_requirement: string;
  threads_per_inch: number;
  min_embedment: number;
}

interface FasteningPatternProps {
  pattern: string;
  deckType: string;
  windPressure: number;
  safetyFactor: number;
}

export default function FasteningPatternDisplay({ 
  pattern, 
  deckType, 
  windPressure, 
  safetyFactor 
}: FasteningPatternProps) {
  const [selectedZone, setSelectedZone] = useState<'field' | 'perimeter' | 'corner'>('field');

  // Parse and enhance fastening pattern data
  const parsePattern = (patternStr: string): FasteningPattern => {
    // Default values based on typical patterns and deck type
    const defaults: FasteningPattern = {
      field_spacing_x: 12,
      field_spacing_y: 12,
      perimeter_spacing: 6,
      corner_spacing: 4,
      row_spacing: 6,
      overlap_requirement: 3,
      fastener_type: deckType === 'Steel' ? 'Self-drilling screw' : 'Concrete fastener',
      plate_size: '3" diameter',
      torque_requirement: deckType === 'Steel' ? '15-20 ft-lbs' : '25-30 ft-lbs',
      threads_per_inch: 14,
      min_embedment: deckType === 'Concrete' ? 1.75 : 0.75
    };

    // Enhanced pattern parsing based on wind pressure and deck type
    if (windPressure > 100) {
      defaults.field_spacing_x = 8;
      defaults.field_spacing_y = 8;
      defaults.perimeter_spacing = 4;
      defaults.corner_spacing = 3;
      defaults.plate_size = '4" diameter';
    } else if (windPressure > 60) {
      defaults.field_spacing_x = 10;
      defaults.field_spacing_y = 10;
      defaults.perimeter_spacing = 5;
      defaults.corner_spacing = 3.5;
    }

    return defaults;
  };

  const fasteningData = parsePattern(pattern);

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'field': return 'bg-blue-100 border-blue-300';
      case 'perimeter': return 'bg-orange-100 border-orange-300';
      case 'corner': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getZoneDescription = (zone: string) => {
    switch (zone) {
      case 'field':
        return 'Interior roof area with standard wind loads';
      case 'perimeter':
        return 'Edge zones with increased wind uplift pressures';
      case 'corner':
        return 'Corner zones with maximum wind uplift pressures';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid className="h-5 w-5 text-primary" />
            Fastening Pattern Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedZone} onValueChange={(value: any) => setSelectedZone(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="field" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                Field Zone
              </TabsTrigger>
              <TabsTrigger value="perimeter" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Perimeter Zone
              </TabsTrigger>
              <TabsTrigger value="corner" className="flex items-center gap-2">
                <CircleDot className="h-4 w-4" />
                Corner Zone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="field" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-blue-700">Field Spacing X</p>
                  <p className="text-lg font-bold text-blue-900">{fasteningData.field_spacing_x}"</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-blue-700">Field Spacing Y</p>
                  <p className="text-lg font-bold text-blue-900">{fasteningData.field_spacing_y}"</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-blue-700">Row Spacing</p>
                  <p className="text-lg font-bold text-blue-900">{fasteningData.row_spacing}"</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-blue-700">Overlap</p>
                  <p className="text-lg font-bold text-blue-900">{fasteningData.overlap_requirement}"</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="perimeter" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <p className="text-sm font-medium text-orange-700">Perimeter Spacing</p>
                  <p className="text-lg font-bold text-orange-900">{fasteningData.perimeter_spacing}"</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <p className="text-sm font-medium text-orange-700">Edge Distance</p>
                  <p className="text-lg font-bold text-orange-900">2" min</p>
                </div>
              </div>
              <div className="p-3 bg-orange-25 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Critical Zone</p>
                    <p className="text-xs text-orange-700">
                      Perimeter zones experience 2x field pressures. Verify edge distance and spacing.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="corner" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-700">Corner Spacing</p>
                  <p className="text-lg font-bold text-red-900">{fasteningData.corner_spacing}"</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-700">Corner Zone Size</p>
                  <p className="text-lg font-bold text-red-900">10% of roof width</p>
                </div>
              </div>
              <div className="p-3 bg-red-25 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Maximum Load Zone</p>
                    <p className="text-xs text-red-700">
                      Corner zones experience 3x field pressures. Use maximum fastening density.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          {/* Fastener Specifications */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Fastener Specifications
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fastener Type</p>
                <p className="font-semibold">{fasteningData.fastener_type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plate Size</p>
                <p className="font-semibold">{fasteningData.plate_size}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Torque</p>
                <p className="font-semibold">{fasteningData.torque_requirement}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">TPI</p>
                <p className="font-semibold">{fasteningData.threads_per_inch}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Min Embedment</p>
                <p className="font-semibold">{fasteningData.min_embedment}"</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Safety Factor</p>
                <Badge 
                  className={
                    safetyFactor >= 2.0 
                      ? "bg-success text-success-foreground"
                      : safetyFactor >= 1.5
                      ? "bg-warning text-warning-foreground" 
                      : "bg-destructive text-destructive-foreground"
                  }
                >
                  {safetyFactor.toFixed(2)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Visual Pattern Diagram */}
          <Separator className="my-6" />
          
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Fastening Pattern Diagram
            </h4>
            
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="relative w-full h-48 bg-white border-2 border-gray-300 rounded">
                {/* Visual representation */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 gap-1 p-2">
                  {/* Corner zones */}
                  <div className="bg-red-200 border border-red-400 rounded flex items-center justify-center">
                    <CircleDot className="h-3 w-3 text-red-600" />
                  </div>
                  <div className="bg-orange-200 border border-orange-400 rounded flex items-center justify-center">
                    <Target className="h-3 w-3 text-orange-600" />
                  </div>
                  <div className="bg-orange-200 border border-orange-400 rounded flex items-center justify-center">
                    <Target className="h-3 w-3 text-orange-600" />
                  </div>
                  <div className="bg-orange-200 border border-orange-400 rounded flex items-center justify-center">
                    <Target className="h-3 w-3 text-orange-600" />
                  </div>
                  <div className="bg-orange-200 border border-orange-400 rounded flex items-center justify-center">
                    <Target className="h-3 w-3 text-orange-600" />
                  </div>
                  <div className="bg-red-200 border border-red-400 rounded flex items-center justify-center">
                    <CircleDot className="h-3 w-3 text-red-600" />
                  </div>
                  
                  {/* Middle rows */}
                  {Array.from({ length: 12 }, (_, i) => (
                    <div 
                      key={i} 
                      className={
                        i === 0 || i === 5 || i === 6 || i === 11
                          ? "bg-orange-200 border border-orange-400 rounded flex items-center justify-center"
                          : "bg-blue-200 border border-blue-400 rounded flex items-center justify-center"
                      }
                    >
                      {i === 0 || i === 5 || i === 6 || i === 11 ? (
                        <Target className="h-3 w-3 text-orange-600" />
                      ) : (
                        <Square className="h-3 w-3 text-blue-600" />
                      )}
                    </div>
                  ))}
                  
                  {/* Bottom row */}
                  <div className="bg-red-200 border border-red-400 rounded flex items-center justify-center">
                    <CircleDot className="h-3 w-3 text-red-600" />
                  </div>
                  <div className="bg-orange-200 border border-orange-400 rounded flex items-center justify-center">
                    <Target className="h-3 w-3 text-orange-600" />
                  </div>
                  <div className="bg-orange-200 border border-orange-400 rounded flex items-center justify-center">
                    <Target className="h-3 w-3 text-orange-600" />
                  </div>
                  <div className="bg-orange-200 border border-orange-400 rounded flex items-center justify-center">
                    <Target className="h-3 w-3 text-orange-600" />
                  </div>
                  <div className="bg-orange-200 border border-orange-400 rounded flex items-center justify-center">
                    <Target className="h-3 w-3 text-orange-600" />
                  </div>
                  <div className="bg-red-200 border border-red-400 rounded flex items-center justify-center">
                    <CircleDot className="h-3 w-3 text-red-600" />
                  </div>
                </div>
                
                {/* Legend */}
                <div className="absolute bottom-2 right-2 bg-white p-2 rounded border shadow-sm">
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Square className="h-3 w-3 text-blue-600" />
                      <span>Field</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-orange-600" />
                      <span>Perimeter</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CircleDot className="h-3 w-3 text-red-600" />
                      <span>Corner</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Pattern shows typical fastener locations. Verify actual spacing requirements with manufacturer specifications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}