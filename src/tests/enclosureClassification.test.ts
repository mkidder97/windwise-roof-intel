import { describe, test, expect } from '@jest/globals';
import { classifyBuildingEnclosure } from '../lib/asceCalculations';

describe('Building Enclosure Classification', () => {
  describe('ASCE 7-22 Section 26.12 Compliance', () => {
    test('Enclosed building definition - basic case', () => {
      const wallArea = 10000; // sq ft
      const openings = [
        { area: 30, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false },
        { area: 50, location: 'leeward' as const, type: 'window' as const, isGlazed: true, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('enclosed');
      expect(result.totalOpeningArea).toBe(80);
      expect(result.windwardOpeningArea).toBe(30);
      expect(result.percentOpenArea).toBeCloseTo(0.8, 1);
      
      // ASCE 7-22 Table 26.13-1 values for enclosed buildings
      expect(result.GCpi_positive).toBe(0.18);
      expect(result.GCpi_negative).toBe(-0.18);
    });

    test('Partially enclosed - windward opening dominance', () => {
      // Case where windward opening area > sum of other openings
      const wallArea = 8000;
      const openings = [
        { area: 200, location: 'windward' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 50, location: 'leeward' as const, type: 'door' as const, isGlazed: false, canFail: false },
        { area: 30, location: 'side' as const, type: 'window' as const, isGlazed: true, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('partially_enclosed');
      expect(result.windwardOpeningArea).toBe(200);
      expect(result.windwardOpeningArea).toBeGreaterThan(80); // sum of other openings
      
      // ASCE 7-22 Table 26.13-1 values for partially enclosed buildings
      expect(result.GCpi_positive).toBe(0.55);
      expect(result.GCpi_negative).toBe(-0.55);
    });

    test('Partially enclosed - large opening percentage', () => {
      // Case where total opening area > 4 sq ft or 1% of wall area
      const wallArea = 5000;
      const openings = [
        { area: 80, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: false },
        { area: 60, location: 'leeward' as const, type: 'window' as const, isGlazed: true, canFail: false },
        { area: 40, location: 'side' as const, type: 'door' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('partially_enclosed');
      expect(result.percentOpenArea).toBeGreaterThan(1.0); // > 1% threshold
      expect(result.totalOpeningArea).toBeGreaterThan(Math.max(4, wallArea * 0.01));
    });

    test('Open building classification', () => {
      // Building with > 80% wall area as openings
      const wallArea = 4000;
      const openings = [
        { area: 1200, location: 'windward' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 1000, location: 'leeward' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 800, location: 'side' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 200, location: 'side' as const, type: 'vent' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('open');
      expect(result.percentOpenArea).toBeGreaterThan(80);
      expect(result.totalOpeningArea).toBe(3200);
    });
  });

  describe('Failure Scenario Analysis', () => {
    test('Glazed opening failure converts enclosed to partially enclosed', () => {
      const wallArea = 12000;
      const openings = [
        { area: 60, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false },
        { area: 400, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: true }, // Large glazed area
        { area: 40, location: 'leeward' as const, type: 'vent' as const, isGlazed: false, canFail: false },
        { area: 30, location: 'side' as const, type: 'window' as const, isGlazed: true, canFail: false }
      ];
      
      // Without failure consideration
      const resultNoFailure = classifyBuildingEnclosure(wallArea, openings, false);
      expect(resultNoFailure.type).toBe('enclosed');
      
      // With failure consideration
      const resultWithFailure = classifyBuildingEnclosure(wallArea, openings, true);
      expect(resultWithFailure.type).toBe('partially_enclosed');
      expect(resultWithFailure.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Failure scenario: Large glazed openings may fail')
        ])
      );
    });

    test('Multiple glazed openings failure scenario', () => {
      const wallArea = 10000;
      const openings = [
        { area: 100, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: true },
        { area: 150, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: true },
        { area: 50, location: 'leeward' as const, type: 'door' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, true);
      
      expect(result.type).toBe('partially_enclosed');
      // Should identify significant glazed area that can fail
      expect(result.warnings.some(w => w.includes('Failure scenario'))).toBe(true);
    });

    test('Non-glazed openings do not trigger failure scenarios', () => {
      const wallArea = 8000;
      const openings = [
        { area: 200, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false },
        { area: 150, location: 'windward' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 40, location: 'leeward' as const, type: 'vent' as const, isGlazed: false, canFail: false }
      ];
      
      const resultNoFailure = classifyBuildingEnclosure(wallArea, openings, false);
      const resultWithFailure = classifyBuildingEnclosure(wallArea, openings, true);
      
      // Should be the same since no glazed openings can fail
      expect(resultNoFailure.type).toBe(resultWithFailure.type);
      expect(resultWithFailure.warnings.filter(w => w.includes('Failure scenario')).length).toBe(0);
    });

    test('Small glazed areas do not trigger failure warnings', () => {
      const wallArea = 8000;
      const openings = [
        { area: 30, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: true }, // Small window
        { area: 50, location: 'leeward' as const, type: 'door' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, true);
      
      // Small glazed area shouldn't trigger major failure scenario warnings
      expect(result.warnings.filter(w => w.includes('Large glazed openings')).length).toBe(0);
    });
  });

  describe('Edge Cases and Validation', () => {
    test('No openings defaults to enclosed', () => {
      const result = classifyBuildingEnclosure(5000, [], false);
      
      expect(result.type).toBe('enclosed');
      expect(result.totalOpeningArea).toBe(0);
      expect(result.windwardOpeningArea).toBe(0);
      expect(result.percentOpenArea).toBe(0);
      expect(result.GCpi_positive).toBe(0.18);
      expect(result.GCpi_negative).toBe(-0.18);
    });

    test('Single large opening determines classification', () => {
      const wallArea = 6000;
      const openings = [
        { area: 500, location: 'windward' as const, type: 'garage' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('partially_enclosed');
      expect(result.windwardOpeningArea).toBe(500);
    });

    test('All windward openings classification', () => {
      const wallArea = 8000;
      const openings = [
        { area: 100, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false },
        { area: 80, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: false },
        { area: 60, location: 'windward' as const, type: 'vent' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('partially_enclosed');
      expect(result.windwardOpeningArea).toBe(240);
      expect(result.totalOpeningArea).toBe(240);
      expect(result.windwardOpeningArea).toBeGreaterThan(0); // All openings are windward
    });

    test('Threshold boundary conditions', () => {
      // Test right at the 1% wall area boundary
      const wallArea = 10000;
      const openings = [
        { area: 100, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: false }, // Exactly 1%
        { area: 50, location: 'leeward' as const, type: 'door' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      // At 1% threshold, should be partially enclosed if other conditions are met
      expect(result.percentOpenArea).toBeCloseTo(1.5, 1);
      expect(result.type).toBe('partially_enclosed');
    });

    test('Various opening types and materials', () => {
      const wallArea = 8000;
      const openings = [
        { area: 50, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false },
        { area: 80, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: true },
        { area: 30, location: 'leeward' as const, type: 'vent' as const, isGlazed: false, canFail: false },
        { area: 200, location: 'side' as const, type: 'garage' as const, isGlazed: false, canFail: false }
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.type).toBe('partially_enclosed');
      expect(result.reasoning).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Windward opening area')
        ])
      );
    });
  });

  describe('Internal Pressure Coefficient Validation', () => {
    test('Enclosed building GCpi values per ASCE 7-22 Table 26.13-1', () => {
      const result = classifyBuildingEnclosure(5000, [
        { area: 40, location: 'windward' as const, type: 'door' as const, isGlazed: false, canFail: false }
      ], false);
      
      expect(result.GCpi_positive).toBe(0.18);
      expect(result.GCpi_negative).toBe(-0.18);
    });

    test('Partially enclosed building GCpi values per ASCE 7-22 Table 26.13-1', () => {
      const result = classifyBuildingEnclosure(5000, [
        { area: 100, location: 'windward' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 30, location: 'leeward' as const, type: 'door' as const, isGlazed: false, canFail: false }
      ], false);
      
      expect(result.GCpi_positive).toBe(0.55);
      expect(result.GCpi_negative).toBe(-0.55);
    });

    test('Open building GCpi values', () => {
      const result = classifyBuildingEnclosure(4000, [
        { area: 1500, location: 'windward' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 1500, location: 'leeward' as const, type: 'garage' as const, isGlazed: false, canFail: false }
      ], false);
      
      expect(result.type).toBe('open');
      expect(result.GCpi_positive).toBe(0.0);
      expect(result.GCpi_negative).toBe(0.0);
    });
  });

  describe('Reasoning and Documentation', () => {
    test('Classification reasoning is documented', () => {
      const result = classifyBuildingEnclosure(8000, [
        { area: 150, location: 'windward' as const, type: 'garage' as const, isGlazed: false, canFail: false },
        { area: 50, location: 'leeward' as const, type: 'door' as const, isGlazed: false, canFail: false }
      ], false);
      
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning.some(r => r.includes('Windward opening area'))).toBe(true);
    });

    test('Warnings are generated for critical conditions', () => {
      const result = classifyBuildingEnclosure(6000, [
        { area: 200, location: 'windward' as const, type: 'window' as const, isGlazed: true, canFail: true }
      ], true);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Failure scenario'))).toBe(true);
    });

    test('Large opening area warnings', () => {
      const wallArea = 8000;
      const openings = [
        { area: 800, location: 'windward' as const, type: 'garage' as const, isGlazed: false, canFail: false } // 10% of wall area
      ];
      
      const result = classifyBuildingEnclosure(wallArea, openings, false);
      
      expect(result.warnings.some(w => w.includes('Large opening'))).toBe(true);
    });
  });
});