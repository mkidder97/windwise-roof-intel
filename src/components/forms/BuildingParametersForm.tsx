import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Building, MapPin, Wind } from 'lucide-react';
import type { BuildingDimensions, LocationData, ASCEParameters } from '@/types/wind-calculator';
import { exposureDescriptions, asceEditions, roofTypes, deckTypes } from '@/types/wind-calculator';

interface BuildingParametersFormProps {
  onDimensionsChange?: (dimensions: BuildingDimensions) => void;
  onLocationChange?: (location: LocationData) => void;
  onASCEChange?: (params: ASCEParameters) => void;
}

export const BuildingParametersForm: React.FC<BuildingParametersFormProps> = ({
  onDimensionsChange,
  onLocationChange,
  onASCEChange
}) => {
  const form = useFormContext();

  const handleDimensionChange = (field: string, value: number) => {
    if (onDimensionsChange) {
      const currentValues = form.getValues();
      const dimensions: BuildingDimensions = {
        height: field === 'buildingHeight' ? value : currentValues.buildingHeight,
        length: field === 'buildingLength' ? value : currentValues.buildingLength,
        width: field === 'buildingWidth' ? value : currentValues.buildingWidth,
        roofType: field === 'roofType' ? value : currentValues.roofType,
        deckType: field === 'deckType' ? value : currentValues.deckType
      };
      onDimensionsChange(dimensions);
    }
  };

  const handleLocationChange = (field: string, value: string) => {
    if (onLocationChange) {
      const currentValues = form.getValues();
      const location: LocationData = {
        city: field === 'city' ? value : currentValues.city,
        state: field === 'state' ? value : currentValues.state
      };
      onLocationChange(location);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="projectName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter project name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Building Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Building Dimensions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="buildingHeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (ft)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={e => {
                        const value = parseFloat(e.target.value);
                        field.onChange(value);
                        handleDimensionChange('buildingHeight', value);
                      }} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buildingLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Length (ft)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={e => {
                        const value = parseFloat(e.target.value);
                        field.onChange(value);
                        handleDimensionChange('buildingLength', value);
                      }} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buildingWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Width (ft)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={e => {
                        const value = parseFloat(e.target.value);
                        field.onChange(value);
                        handleDimensionChange('buildingWidth', value);
                      }} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="roofType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roof Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (onDimensionsChange) {
                        const currentValues = form.getValues();
                        const dimensions: BuildingDimensions = {
                          height: currentValues.buildingHeight,
                          length: currentValues.buildingLength,
                          width: currentValues.buildingWidth,
                          roofType: value,
                          deckType: currentValues.deckType
                        };
                        onDimensionsChange(dimensions);
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select roof type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roofTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deckType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deck Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (onDimensionsChange) {
                        const currentValues = form.getValues();
                        const dimensions: BuildingDimensions = {
                          height: currentValues.buildingHeight,
                          length: currentValues.buildingLength,
                          width: currentValues.buildingWidth,
                          roofType: currentValues.roofType,
                          deckType: value
                        };
                        onDimensionsChange(dimensions);
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select deck type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {deckTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter city" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        handleLocationChange('city', e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter state" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        handleLocationChange('state', e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* ASCE Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            ASCE Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="asceEdition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ASCE Edition</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ASCE edition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {asceEditions.map((edition) => (
                        <SelectItem key={edition} value={edition}>{edition}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exposureCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exposure Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select exposure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(exposureDescriptions).map(([key, desc]) => (
                        <SelectItem key={key} value={key}>
                          <div>
                            <div className="font-medium">Category {key}</div>
                            <div className="text-xs text-muted-foreground">{desc}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="topographicFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topographic Factor (Kzt)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="directionalityFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Directionality Factor (Kd)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="calculationMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calculation Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="component_cladding">Component & Cladding</SelectItem>
                      <SelectItem value="mwfrs">Main Wind Force Resisting System</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};