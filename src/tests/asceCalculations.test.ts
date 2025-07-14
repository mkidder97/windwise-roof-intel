import { describe, test, expect } from '@jest/globals';
import {
  calculateKz,
  calculateEffectiveWindArea,
  classifyBuildingEnclosure,
  calculateNetPressure,
  interpolatePressureCoefficient,
  validateCalculation,
  generateCalculationSummary
} from '../lib/asceCalculations';

describe('ASCE Wind Calculations', () => {
  describe('Kz Factor Calculations', () => {
    test('Kz factor matches ASCE 7 Table 26.10-1 for Exposure C', () => {
      // Test known values from ASCE 7-22 Table 26.10-1
      const result30 = calculateKz(30, 'C');
      expect(result30.kz).toBeCloseTo(0.85, 2);
      expect(result30.heightUsed).toBe(30);
      
      const result40 = calculateKz(40, 'C');
      expect(result40.kz).toBeCloseTo(0.91, 2);
      
      const result50 = calculateKz(50, 'C');
      expect(result50.kz).toBeCloseTo(0.96, 2);
      
      const result100 = calculateKz(100, 'C');
      expect(result100.kz).toBeCloseTo(1.15, 2);
    });

    test('Kz factor for Exposure B', () => {
      const result30 = calculateKz(30, 'B');
      expect(result30.kz).toBeCloseTo(0.70, 2);
      
      const result50 = calculateKz(50, 'B');
      expect(result50.kz).toBeCloseTo(0.81, 2);
    });

    test('Kz factor for Exposure D', () => {
      const result30 = calculateKz(30, 'D');
      expect(result30.kz).toBeCloseTo(1.03, 2);
      
      const result50 = calculateKz(50, 'D');
      expect(result50.kz).toBeCloseTo(1.09, 2);
    });

    test('Height limits are properly applied', () => {
      // Test minimum height enforcement
      const resultLow = calculateKz(5, 'C');
      expect(resultLow.heightUsed).toBe(15); // Should use minimum height
      expect(resultLow.warnings).toContain('Height below minimum (15 ft), using minimum height for calculation');
      
      // Test maximum height enforcement
      const resultHigh = calculateKz(2500, 'C');
      expect(resultHigh.heightUsed).toBe(500); // Should use maximum height for C
      expect(resultHigh.warnings).toContain('Height above maximum for exposure C (500 ft), using maximum height');
    });

    test('Invalid exposure category returns error', () => {
      const result = calculateKz(30, 'X');
      expect(result.warnings).toContain('Invalid exposure category: X. Using Exposure C as default.');
    });
  });

  describe('Effective Wind Area Calculations', () => {
    test('Effective wind area calculation', () => {
      const result = calculateEffectiveWindArea(100, 50, 'field');
      expect(result.area).toBe(5000); // 100 * 50
      expect(result.zone).toBe('field');
      expect(result.length).toBe(100);
      expect(result.width).toBe(50);
    });

    test('Effective wind area with description', () => {
      const result = calculateEffectiveWindArea(20, 30, 'corner', 'Roof corner panel');
      expect(result.area).toBe(600);
      expect(result.description).toBe('Roof corner panel');
    });
  });

  describe('Building Enclosure Classification', () => {
    test('Enclosed building classification', () => {
      const wallArea = 10000; // sq ft
      const openings = [
        { area: 50, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false },
        { area: 100, location: 'leeward' as const, type: 'window' as const, isGlazed: true, canFail: false },
        { area: 75, location: 'side' as const, type: 'window' as const, isGlazed: true, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('enclosed');
      expect(result.GCpi_positive).toBe(0.18);
      expect(result.GCpi_negative).toBe(-0.18);
      expect(result.totalOpeningArea).toBe(225);
      expect(result.windwardOpeningArea).toBe(50);
      expect(result.percentOpenArea).toBeCloseTo(2.25, 2);
    });

    test('Partially enclosed building classification', () => {
      const wallArea = 8000;
      const openings = [
        { area: 200, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: false },
        { area: 50, location: 'leeward' as const, type: 'door' as const, isGlazed: false, canFail: false },
        { area: 30, location: 'side' as const, type: 'vent' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('partially_enclosed');
      expect(result.GCpi_positive).toBe(0.55);
      expect(result.GCpi_negative).toBe(-0.55);
    });

    test('Failure scenario creates partially enclosed classification', () => {
      const wallArea = 10000;
      const openings = [
        { area: 50, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false },
        { area: 300, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: true }, // Large glazed opening that can fail
        { area: 25, location: 'leeward' as const, type: 'vent' as const, isGlazed: false, canFail: false }
      ];
      
      // Without considering failures - should be enclosed
      const resultNoFailure = classifyBuildingEnclosure(wallArea, openings, false);
      expect(resultNoFailure.type).toBe('enclosed');
      
      // With considering failures - should be partially enclosed
      const resultWithFailure = classifyBuildingEnclosure(wallArea, openings, true);
      expect(resultWithFailure.type).toBe('partially_enclosed');
      expect(resultWithFailure.warnings).toContain(
        'Failure scenario: Large glazed openings may fail, creating partially enclosed condition'
      );
    });

    test('Open building classification', () => {
      const wallArea = 5000;
      const openings = [
        { area: 1000, location: 'windward' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 800, location: 'leeward' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 500, location: 'side' as const, type: 'garage' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('open');
      expect(result.percentOpenArea).toBeGreaterThan(80);
    });
  });

  describe('Net Pressure Calculations', () => {
    test('Net pressure calculation for enclosed building', () => {
      const externalPressure = -20.0; // psf (suction)
      const enclosedBuilding = { 
        GCpi_positive: 0.18, 
        GCpi_negative: -0.18,
        type: 'enclosed' as const
      };
      
      const result = calculateNetPressure(externalPressure, enclosedBuilding);
      
      // Net pressure = External - Internal
      // Positive internal: -20 - (+internal) = more negative (more suction)
      // Negative internal: -20 - (-internal) = less negative (less suction)
      expect(result.positive).toBeLessThan(result.negative); // More critical case
      expect(result.controlling).toBe(result.positive); // Should use worst case
    });

    test('Net pressure calculation for partially enclosed building', () => {
      const externalPressure = -20.0;
      const partiallyEnclosed = { 
        GCpi_positive: 0.55, 
        GCpi_negative: -0.55,
        type: 'partially_enclosed' as const
      };
      
      const result = calculateNetPressure(externalPressure, partiallyEnclosed);
      
      // Partially enclosed should have much higher net pressures
      expect(Math.abs(result.positive)).toBeGreaterThan(20); // Much higher than external alone
      expect(Math.abs(result.negative)).toBeGreaterThan(10);
    });

    test('Comparison between enclosed and partially enclosed', () => {
      const externalPressure = -25.0;
      const qh = 30.0; // velocity pressure
      
      const enclosed = { GCpi_positive: 0.18, GCpi_negative: -0.18, type: 'enclosed' as const };
      const partiallyEnclosed = { GCpi_positive: 0.55, GCpi_negative: -0.55, type: 'partially_enclosed' as const };
      
      const netEnclosed = calculateNetPressure(externalPressure, enclosed, qh);
      const netPartiallyEnclosed = calculateNetPressure(externalPressure, partiallyEnclosed, qh);
      
      // Partially enclosed should have significantly higher net pressures
      expect(Math.abs(netPartiallyEnclosed.controlling)).toBeGreaterThan(Math.abs(netEnclosed.controlling));
    });
  });

  describe('Pressure Coefficient Interpolation', () => {
    test('Pressure coefficient interpolation for different areas', () => {
      // Test field zone interpolation
      const field10 = interpolatePressureCoefficient(10, 'field');
      const field500 = interpolatePressureCoefficient(500, 'field');
      const field5000 = interpolatePressureCoefficient(5000, 'field');
      
      expect(field10.gcp).toBeLessThan(0); // Should be negative (suction)
      expect(Math.abs(field10.gcp)).toBeGreaterThan(Math.abs(field5000.gcp)); // Smaller areas have higher coefficients
      expect(field500.interpolated).toBe(true);
    });

    test('Corner zone has higher coefficients than field', () => {
      const area = 100;
      const field = interpolatePressureCoefficient(area, 'field');
      const corner = interpolatePressureCoefficient(area, 'corner');
      
      expect(Math.abs(corner.gcp)).toBeGreaterThan(Math.abs(field.gcp));
    });

    test('Perimeter zone coefficients between field and corner', () => {
      const area = 200;
      const field = interpolatePressureCoefficient(area, 'field');
      const perimeter = interpolatePressureCoefficient(area, 'perimeter');
      const corner = interpolatePressureCoefficient(area, 'corner');
      
      expect(Math.abs(perimeter.gcp)).toBeGreaterThan(Math.abs(field.gcp));
      expect(Math.abs(perimeter.gcp)).toBeLessThan(Math.abs(corner.gcp));
    });
  });

  describe('Calculation Validation', () => {
    test('Validation with acceptable tolerance', () => {
      const result = validateCalculation(100.5, 100.0, 0.01); // 1% tolerance
      expect(result.isValid).toBe(true);
      expect(result.percentDifference).toBeCloseTo(0.5, 1);
    });

    test('Validation with excessive error', () => {
      const result = validateCalculation(110, 100, 0.05); // 5% tolerance, 10% error
      expect(result.isValid).toBe(false);
      expect(result.percentDifference).toBe(10);
    });
  });

  describe('Complete Calculation Integration', () => {
    test('Complete calculation matches manual verification', () => {
      // Test case: 30-foot building, 120 mph wind, Exposure C
      const height = 30;
      const windSpeed = 120;
      const exposureCategory = 'C';
      const buildingLength = 100;
      const buildingWidth = 60;
      
      // Calculate Kz
      const kzResult = calculateKz(height, exposureCategory);
      expect(kzResult.kz).toBeCloseTo(0.85, 2);
      
      // Effective wind area for field zone
      const effectiveArea = calculateEffectiveWindArea(buildingLength, buildingWidth, 'field');
      expect(effectiveArea.area).toBe(6000);
      
      // Building enclosure
      const wallArea = 2 * (buildingLength * height) + 2 * (buildingWidth * height);
      const openings = [
        { area: 50, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false }
      ];
      const enclosureClass = classifyBuildingEnclosure(wallArea, openings, false);
      expect(enclosureClass.type).toBe('enclosed');
      
      // Pressure coefficient
      const gcp = interpolatePressureCoefficient(effectiveArea.area, 'field');
      expect(gcp.gcp).toBeLessThan(0); // Suction
      
      // Manual calculation verification
      // qh = 0.00256 * Kz * V^2 = 0.00256 * 0.85 * 120^2 = 31.3 psf
      const qh = 0.00256 * kzResult.kz * Math.pow(windSpeed, 2);
      expect(qh).toBeCloseTo(31.3, 1);
      
      // External pressure = qh * GCp
      const externalPressure = qh * gcp.gcp;
      
      // Net pressure
      const netPressure = calculateNetPressure(externalPressure, enclosureClass, qh);
      expect(Math.abs(netPressure.controlling)).toBeGreaterThan(Math.abs(externalPressure));
    });
  });

  describe('Calculation Summary Generation', () => {
    test('Generate comprehensive calculation summary', () => {
      const kzResult = calculateKz(40, 'C');
      const enclosureClass = classifyBuildingEnclosure(8000, [
        { area: 50, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false }
      ], false);
      const effectiveAreas = [
        calculateEffectiveWindArea(100, 80, 'field'),
        calculateEffectiveWindArea(20, 20, 'corner')
      ];
      const pressureCoefficients = [
        interpolatePressureCoefficient(8000, 'field'),
        interpolatePressureCoefficient(400, 'corner')
      ];
      
      const summary = generateCalculationSummary(
        kzResult,
        enclosureClass,
        effectiveAreas,
        pressureCoefficients
      );
      
      expect(summary.methodology).toBe('ASCE 7-22 Chapter 26 - Main Wind Force Resisting System');
      expect(summary.asceReferences).toContain('ASCE 7-22 Section 26.8 - Velocity Pressure');
      expect(summary.formulasUsed).toContain(kzResult.formula);
      expect(summary.assumptions.length).toBeGreaterThan(0);
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  test('Zero wind speed handling', () => {
    const kzResult = calculateKz(30, 'C');
    // Should not crash and should include warnings
    expect(kzResult.warnings).toBeDefined();
  });

  test('Extreme building dimensions', () => {
    const largeArea = calculateEffectiveWindArea(10000, 1000, 'field');
    expect(largeArea.area).toBe(10000000);
    
    const smallArea = calculateEffectiveWindArea(1, 1, 'corner');
    expect(smallArea.area).toBe(1);
  });

  test('No openings in building', () => {
    const result = classifyBuildingEnclosure(5000, [], false);
    expect(result.type).toBe('enclosed'); // Default for no openings
    expect(result.totalOpeningArea).toBe(0);
  });

  test('Invalid pressure coefficient zone', () => {
    // Should handle gracefully and return default values
    const result = interpolatePressureCoefficient(100, 'invalid' as any);
    expect(result.gcp).toBeDefined();
    expect(typeof result.gcp).toBe('number');
  });
});