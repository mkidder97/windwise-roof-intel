import React, { useState } from 'react';
import { Plus, Trash2, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BuildingVisualization } from './BuildingVisualization';
import { classifyBuildingEnclosure } from '@/lib/asceCalculations';

interface BuildingOpening {
  id: string;
  area: number;
  location: 'windward' | 'leeward' | 'side';
  type: 'door' | 'window' | 'vent' | 'garage';
  isGlazed: boolean;
  canFail: boolean;
  x: number; // Position percentage
  y: number; // Position percentage
  width: number; // Width percentage
  height: number; // Height percentage
}

interface EnclosureInputProps {
  buildingLength: number;
  buildingWidth: number;
  buildingHeight: number;
  onOpeningsChange: (openings: BuildingOpening[]) => void;
  onEnclosureClassChange: (classification: any) => void;
  considerFailures: boolean;
  onConsiderFailuresChange: (consider: boolean) => void;
}

export function EnclosureInput({
  buildingLength,
  buildingWidth,
  buildingHeight,
  onOpeningsChange,
  onEnclosureClassChange,
  considerFailures,
  onConsiderFailuresChange
}: EnclosureInputProps) {
  const [openings, setOpenings] = useState<BuildingOpening[]>([]);
  const [windDirection, setWindDirection] = useState(0);
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null);

  // Calculate total wall area
  const totalWallArea = 2 * (buildingLength * buildingHeight) + 2 * (buildingWidth * buildingHeight);

  // Classify building enclosure
  const enclosureClassification = React.useMemo(() => {
    if (openings.length === 0) return null;
    
    const openingsForClassification = openings.map(opening => ({
      area: opening.area,
      location: opening.location,
      type: opening.type,
      isGlazed: opening.isGlazed,
      canFail: opening.canFail
    }));
    
    return classifyBuildingEnclosure(totalWallArea, openingsForClassification, considerFailures);
  }, [openings, totalWallArea, considerFailures]);

  React.useEffect(() => {
    onOpeningsChange(openings);
  }, [openings, onOpeningsChange]);

  React.useEffect(() => {
    onEnclosureClassChange(enclosureClassification);
  }, [enclosureClassification, onEnclosureClassChange]);

  const addOpening = () => {
    const newOpening: BuildingOpening = {
      id: `opening-${Date.now()}`,
      area: 50,
      location: 'windward',
      type: 'window',
      isGlazed: true,
      canFail: false,
      x: 25,
      y: 30,
      width: 15,
      height: 20
    };
    setOpenings([...openings, newOpening]);
    setSelectedOpening(newOpening.id);
  };

  const removeOpening = (id: string) => {
    setOpenings(openings.filter(o => o.id !== id));
    if (selectedOpening === id) {
      setSelectedOpening(null);
    }
  };

  const updateOpening = (id: string, updates: Partial<BuildingOpening>) => {
    setOpenings(openings.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const getOpeningTypeDefaults = (type: string) => {
    const defaults = {
      door: { width: 8, height: 15, isGlazed: false },
      window: { width: 15, height: 12, isGlazed: true },
      vent: { width: 5, height: 5, isGlazed: false },
      garage: { width: 25, height: 20, isGlazed: false }
    };
    return defaults[type as keyof typeof defaults] || defaults.window;
  };

  const selectedOpeningData = openings.find(o => o.id === selectedOpening);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Building Enclosure Definition</span>
            <div className="flex items-center space-x-2">
              <Label htmlFor="consider-failures" className="text-sm">
                Consider failure scenarios
              </Label>
              <Checkbox
                id="consider-failures"
                checked={considerFailures}
                onCheckedChange={onConsiderFailuresChange}
              />
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {considerFailures && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failure scenario analysis enabled. Glazed openings may fail during extreme wind events, 
                potentially changing an enclosed building to partially enclosed with much higher internal pressures.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="wind-direction">Wind Direction (degrees)</Label>
              <Input
                id="wind-direction"
                type="number"
                min="0"
                max="360"
                value={windDirection}
                onChange={(e) => setWindDirection(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Total Wall Area</Label>
              <Input value={`${totalWallArea.toFixed(0)} sq ft`} disabled />
            </div>
            <div>
              <Label>Total Opening Area</Label>
              <Input 
                value={`${openings.reduce((sum, o) => sum + o.area, 0).toFixed(0)} sq ft`} 
                disabled 
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button onClick={addOpening} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Opening</span>
            </Button>
            
            <Button variant="outline" onClick={() => setOpenings([])}>
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main content with tabs */}
      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual">Visual Editor</TabsTrigger>
          <TabsTrigger value="list">Opening List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="visual" className="space-y-4">
          <BuildingVisualization
            buildingLength={buildingLength}
            buildingWidth={buildingWidth}
            buildingHeight={buildingHeight}
            openings={openings}
            enclosureClass={enclosureClassification}
            windDirection={windDirection}
          />
          
          {/* Opening details panel */}
          {selectedOpeningData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Edit Opening: {selectedOpeningData.type}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeOpening(selectedOpeningData.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={selectedOpeningData.type}
                    onValueChange={(value) => {
                      const defaults = getOpeningTypeDefaults(value);
                      updateOpening(selectedOpeningData.id, {
                        type: value as any,
                        ...defaults
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="door">Door</SelectItem>
                      <SelectItem value="window">Window</SelectItem>
                      <SelectItem value="vent">Vent</SelectItem>
                      <SelectItem value="garage">Garage Door</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Location</Label>
                  <Select
                    value={selectedOpeningData.location}
                    onValueChange={(value) => updateOpening(selectedOpeningData.id, { location: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windward">Windward</SelectItem>
                      <SelectItem value="leeward">Leeward</SelectItem>
                      <SelectItem value="side">Side</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Area (sq ft)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={selectedOpeningData.area}
                    onChange={(e) => updateOpening(selectedOpeningData.id, { area: Number(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>X Position (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedOpeningData.x}
                    onChange={(e) => updateOpening(selectedOpeningData.id, { x: Number(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>Y Position (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedOpeningData.y}
                    onChange={(e) => updateOpening(selectedOpeningData.id, { y: Number(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>Width (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={selectedOpeningData.width}
                    onChange={(e) => updateOpening(selectedOpeningData.id, { width: Number(e.target.value) })}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`glazed-${selectedOpeningData.id}`}
                    checked={selectedOpeningData.isGlazed}
                    onCheckedChange={(checked) => updateOpening(selectedOpeningData.id, { isGlazed: !!checked })}
                  />
                  <Label htmlFor={`glazed-${selectedOpeningData.id}`}>Glazed</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`fail-${selectedOpeningData.id}`}
                    checked={selectedOpeningData.canFail}
                    onCheckedChange={(checked) => updateOpening(selectedOpeningData.id, { canFail: !!checked })}
                  />
                  <Label htmlFor={`fail-${selectedOpeningData.id}`}>Can Fail</Label>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="list" className="space-y-4">
          {openings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No openings defined. Add openings to classify building enclosure.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {openings.map((opening) => (
                <Card key={opening.id} className={selectedOpening === opening.id ? 'ring-2 ring-primary' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                        <div>
                          <span className="font-medium capitalize">{opening.type}</span>
                          <p className="text-sm text-muted-foreground">{opening.area} sq ft</p>
                        </div>
                        <div>
                          <span className="capitalize">{opening.location}</span>
                          <p className="text-sm text-muted-foreground">
                            {opening.isGlazed ? 'Glazed' : 'Non-glazed'}
                          </p>
                        </div>
                        <div>
                          <span>{opening.x}%, {opening.y}%</span>
                          <p className="text-sm text-muted-foreground">Position</p>
                        </div>
                        <div>
                          <span>{opening.width}% × {opening.height}%</span>
                          <p className="text-sm text-muted-foreground">Size</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {opening.canFail && (
                          <span className="text-red-600 text-sm">⚠ Can Fail</span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOpening(opening.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeOpening(opening.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}