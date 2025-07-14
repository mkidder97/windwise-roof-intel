import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Package, 
  Clock, 
  Users, 
  DollarSign,
  Download,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface RoofDimensions {
  length: number;
  width: number;
  area: number;
}

interface FasteningPattern {
  field_spacing_x: number;
  field_spacing_y: number;
  perimeter_spacing: number;
  corner_spacing: number;
}

interface MaterialTakeoff {
  fasteners: {
    field: number;
    perimeter: number;
    corner: number;
    total: number;
  };
  plates: number;
  sealant: number; // linear feet
  laborHours: number;
  estimatedCost: number;
}

interface FasteningCalculatorProps {
  roofDimensions?: RoofDimensions;
  fasteningPattern: FasteningPattern;
  deckType: string;
  windPressure: number;
}

export default function FasteningCalculator({ 
  roofDimensions, 
  fasteningPattern, 
  deckType,
  windPressure 
}: FasteningCalculatorProps) {
  const [dimensions, setDimensions] = useState<RoofDimensions>(
    roofDimensions || { length: 100, width: 80, area: 8000 }
  );
  const [takeoff, setTakeoff] = useState<MaterialTakeoff | null>(null);
  const [laborRate, setLaborRate] = useState(75); // per hour
  const [fastenerCost, setFastenerCost] = useState(0.25); // per fastener

  useEffect(() => {
    calculateMaterials();
  }, [dimensions, fasteningPattern]);

  const calculateMaterials = () => {
    // Calculate roof zones
    const perimeterWidth = Math.min(dimensions.width * 0.1, 10); // 10% of width or 10ft max
    const cornerSize = perimeterWidth;
    
    // Areas for each zone
    const totalArea = dimensions.length * dimensions.width;
    const perimeterArea = (2 * dimensions.length * perimeterWidth) + 
                         (2 * (dimensions.width - 2 * perimeterWidth) * perimeterWidth);
    const cornerArea = 4 * (cornerSize * cornerSize);
    const fieldArea = totalArea - perimeterArea - cornerArea;

    // Fastener calculations
    const fieldFasteners = Math.ceil(
      (fieldArea / (fasteningPattern.field_spacing_x * fasteningPattern.field_spacing_y)) * 144
    );
    
    const perimeterFasteners = Math.ceil(
      (perimeterArea / (fasteningPattern.perimeter_spacing * fasteningPattern.perimeter_spacing)) * 144
    );
    
    const cornerFasteners = Math.ceil(
      (cornerArea / (fasteningPattern.corner_spacing * fasteningPattern.corner_spacing)) * 144
    );

    const totalFasteners = fieldFasteners + perimeterFasteners + cornerFasteners;

    // Labor calculations (based on industry standards)
    const baseLaborRate = 0.02; // hours per sq ft base rate
    const complexityFactor = windPressure > 100 ? 1.5 : windPressure > 60 ? 1.25 : 1.0;
    const deckFactor = deckType === 'Concrete' ? 1.3 : deckType === 'Steel' ? 1.1 : 1.0;
    
    const laborHours = totalArea * baseLaborRate * complexityFactor * deckFactor;

    // Material quantities
    const plates = totalFasteners; // 1:1 ratio typically
    const sealantLinearFeet = (2 * dimensions.length + 2 * dimensions.width) * 1.1; // 10% waste

    const materialTakeoff: MaterialTakeoff = {
      fasteners: {
        field: fieldFasteners,
        perimeter: perimeterFasteners,
        corner: cornerFasteners,
        total: totalFasteners
      },
      plates: plates,
      sealant: sealantLinearFeet,
      laborHours: Math.ceil(laborHours * 10) / 10, // round to 1 decimal
      estimatedCost: (totalFasteners * fastenerCost) + (laborHours * laborRate)
    };

    setTakeoff(materialTakeoff);
  };

  const updateDimension = (field: keyof RoofDimensions, value: number) => {
    const newDimensions = { ...dimensions, [field]: value };
    if (field === 'length' || field === 'width') {
      newDimensions.area = newDimensions.length * newDimensions.width;
    }
    setDimensions(newDimensions);
  };

  const generateTakeoffReport = () => {
    if (!takeoff) return;

    const report = `
FASTENING CALCULATION REPORT
Generated: ${new Date().toLocaleDateString()}

ROOF SPECIFICATIONS:
- Dimensions: ${dimensions.length}' x ${dimensions.width}' (${dimensions.area.toLocaleString()} sq ft)
- Deck Type: ${deckType}
- Design Wind Pressure: ${windPressure} psf

FASTENING PATTERN:
- Field Spacing: ${fasteningPattern.field_spacing_x}" x ${fasteningPattern.field_spacing_y}"
- Perimeter Spacing: ${fasteningPattern.perimeter_spacing}"
- Corner Spacing: ${fasteningPattern.corner_spacing}"

MATERIAL TAKEOFF:
- Field Zone Fasteners: ${takeoff.fasteners.field.toLocaleString()}
- Perimeter Zone Fasteners: ${takeoff.fasteners.perimeter.toLocaleString()}
- Corner Zone Fasteners: ${takeoff.fasteners.corner.toLocaleString()}
- Total Fasteners: ${takeoff.fasteners.total.toLocaleString()}
- Plates Required: ${takeoff.plates.toLocaleString()}
- Sealant Required: ${takeoff.sealant.toFixed(0)} linear feet

LABOR ESTIMATE:
- Estimated Installation Time: ${takeoff.laborHours} hours
- Labor Rate: $${laborRate}/hour
- Total Labor Cost: $${(takeoff.laborHours * laborRate).toFixed(2)}

MATERIAL COST:
- Fastener Cost: $${fastenerCost}/each
- Total Material Cost: $${(takeoff.fasteners.total * fastenerCost).toFixed(2)}

TOTAL PROJECT ESTIMATE: $${takeoff.estimatedCost.toFixed(2)}

Note: Prices are estimates only. Verify all quantities and specifications 
with manufacturer requirements before ordering materials.
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fastening-takeoff-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Fastening Calculator & Material Takeoff
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Roof Dimensions Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="length">Roof Length (ft)</Label>
              <Input
                id="length"
                type="number"
                value={dimensions.length}
                onChange={(e) => updateDimension('length', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="width">Roof Width (ft)</Label>
              <Input
                id="width"
                type="number"
                value={dimensions.width}
                onChange={(e) => updateDimension('width', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="area">Total Area (sq ft)</Label>
              <Input
                id="area"
                type="number"
                value={dimensions.area}
                onChange={(e) => updateDimension('area', parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Cost Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="laborRate">Labor Rate ($/hour)</Label>
              <Input
                id="laborRate"
                type="number"
                value={laborRate}
                onChange={(e) => setLaborRate(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fastenerCost">Fastener Cost ($/each)</Label>
              <Input
                id="fastenerCost"
                type="number"
                step="0.01"
                value={fastenerCost}
                onChange={(e) => setFastenerCost(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          {takeoff && (
            <>
              {/* Fastener Quantities */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Material Quantities
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">
                      {takeoff.fasteners.field.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-blue-600">Field Fasteners</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="text-2xl font-bold text-orange-700">
                      {takeoff.fasteners.perimeter.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-orange-600">Perimeter Fasteners</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="text-2xl font-bold text-red-700">
                      {takeoff.fasteners.corner.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-red-600">Corner Fasteners</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="text-2xl font-bold text-green-700">
                      {takeoff.fasteners.total.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-green-600">Total Fasteners</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Plates Required:</span>
                      <span className="text-lg font-bold">{takeoff.plates.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Sealant Needed:</span>
                      <span className="text-lg font-bold">{takeoff.sealant.toFixed(0)} LF</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Labor & Cost Estimates */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Labor & Cost Estimates
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-700">
                      {takeoff.laborHours}h
                    </div>
                    <div className="text-sm font-medium text-purple-600">Installation Time</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <Users className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-700">
                      {Math.ceil(takeoff.laborHours / 8)}
                    </div>
                    <div className="text-sm font-medium text-yellow-600">Crew Days (8hr)</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                    <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-700">
                      ${takeoff.estimatedCost.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-green-600">Total Estimate</div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Cost Breakdown:</p>
                      <div className="text-sm text-amber-700 mt-1 space-y-1">
                        <div className="flex justify-between">
                          <span>Materials ({takeoff.fasteners.total.toLocaleString()} fasteners @ ${fastenerCost}):</span>
                          <span>${(takeoff.fasteners.total * fastenerCost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Labor ({takeoff.laborHours}h @ ${laborRate}/hr):</span>
                          <span>${(takeoff.laborHours * laborRate).toFixed(2)}</span>
                        </div>
                        <Separator className="my-1" />
                        <div className="flex justify-between font-semibold">
                          <span>Total Project Cost:</span>
                          <span>${takeoff.estimatedCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-4">
                <Button 
                  onClick={generateTakeoffReport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Takeoff Report
                </Button>
                <Button 
                  variant="outline"
                  onClick={calculateMaterials}
                  className="flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  Recalculate
                </Button>
              </div>

              {/* Accuracy Notice */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Calculation Notes:</p>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Quantities include 5% waste factor</li>
                      <li>• Labor estimates based on industry averages</li>
                      <li>• Verify final quantities with manufacturer specifications</li>
                      <li>• Actual installation time may vary based on crew experience and conditions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}