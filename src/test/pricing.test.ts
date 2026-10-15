import { describe, expect, it } from 'vitest';

import {
  calculateFinalPrice,
  isFlatDiscount,
  isPercentageDiscount,
  normalizeDiscountType,
  validateDiscount,
} from '../utils/pricing';

describe('Pricing & Discount Calculation Logic', () => {
  describe('calculateFinalPrice', () => {
    it('calculates FLAT discount by subtracting fixed currency amount (MRP ₹35, FLAT ₹5 → ₹30.00)', () => {
      const result = calculateFinalPrice(35, 'FLAT', 5);
      expect(result).toBe(30.0);
    });

    it('calculates PERCENT discount as percentage of MRP (MRP ₹35, PERCENT 5 → ₹33.25)', () => {
      const result = calculateFinalPrice(35, 'PERCENTAGE', 5);
      expect(result).toBe(33.25);
    });

    it('calculates FLAT ₹5 on MRP ₹100 → ₹95.00', () => {
      const result = calculateFinalPrice(100, 'FLAT', 5);
      expect(result).toBe(95.0);
    });

    it('calculates PERCENT 5% on MRP ₹100 → ₹95.00', () => {
      const result = calculateFinalPrice(100, 'PERCENTAGE', 5);
      expect(result).toBe(95.0);
    });

    it('handles zero discount value and returns MRP', () => {
      expect(calculateFinalPrice(50, 'FLAT', 0)).toBe(50.0);
      expect(calculateFinalPrice(50, 'PERCENTAGE', 0)).toBe(50.0);
      expect(calculateFinalPrice(50, null, 0)).toBe(50.0);
    });

    it('handles null / undefined discount value and returns MRP', () => {
      expect(calculateFinalPrice(50, 'FLAT', null)).toBe(50.0);
      expect(calculateFinalPrice(50, 'PERCENTAGE', undefined)).toBe(50.0);
      expect(calculateFinalPrice(50, null, null)).toBe(50.0);
    });

    it('handles boundary: 100% discount results in ₹0.00', () => {
      expect(calculateFinalPrice(80, 'PERCENTAGE', 100)).toBe(0.0);
    });

    it('handles boundary: Flat discount equal to MRP results in ₹0.00', () => {
      expect(calculateFinalPrice(80, 'FLAT', 80)).toBe(0.0);
    });

    it('handles boundary: Flat discount exceeding MRP clamps to ₹0.00', () => {
      expect(calculateFinalPrice(80, 'FLAT', 90)).toBe(0.0);
    });

    it('applies currency rounding to 2 decimal places correctly', () => {
      // 99.99 - (99.99 * 15 / 100) = 99.99 - 14.9985 = 84.9915 -> 84.99
      expect(calculateFinalPrice(99.99, 'PERCENTAGE', 15)).toBe(84.99);
      // 33.33 with 33.33% discount: 33.33 - 11.108889 = 22.221111 -> 22.22
      expect(calculateFinalPrice(33.33, 'PERCENTAGE', 33.33)).toBe(22.22);
      // Flat discount with cents
      expect(calculateFinalPrice(55.5, 'FLAT', 5.25)).toBe(50.25);
    });

    it('returns null for null, undefined, or NaN MRP', () => {
      expect(calculateFinalPrice(null, 'FLAT', 5)).toBeNull();
      expect(calculateFinalPrice(undefined, 'PERCENTAGE', 5)).toBeNull();
      expect(calculateFinalPrice(NaN, 'FLAT', 5)).toBeNull();
    });

    it('supports alternative discount type strings (case-insensitive & synonyms)', () => {
      expect(calculateFinalPrice(100, 'Fixed Amount', 10)).toBe(90.0);
      expect(calculateFinalPrice(100, 'Percentage', 10)).toBe(90.0);
      expect(calculateFinalPrice(100, 'flat', 15)).toBe(85.0);
      expect(calculateFinalPrice(100, 'percent', 15)).toBe(85.0);
      expect(calculateFinalPrice(100, '%', 20)).toBe(80.0);
      expect(calculateFinalPrice(100, '₹', 20)).toBe(80.0);
    });
  });

  describe('isPercentageDiscount & isFlatDiscount & normalizeDiscountType', () => {
    it('identifies percentage discount variants', () => {
      expect(isPercentageDiscount('PERCENTAGE')).toBe(true);
      expect(isPercentageDiscount('Percentage')).toBe(true);
      expect(isPercentageDiscount('percent')).toBe(true);
      expect(isPercentageDiscount('%')).toBe(true);
      expect(isPercentageDiscount('FLAT')).toBe(false);
      expect(isPercentageDiscount('Fixed Amount')).toBe(false);
      expect(isPercentageDiscount(null)).toBe(false);
    });

    it('identifies flat discount variants', () => {
      expect(isFlatDiscount('FLAT')).toBe(true);
      expect(isFlatDiscount('Flat')).toBe(true);
      expect(isFlatDiscount('Fixed Amount')).toBe(true);
      expect(isFlatDiscount('FIXED')).toBe(true);
      expect(isFlatDiscount('₹')).toBe(true);
      expect(isFlatDiscount('PERCENTAGE')).toBe(false);
      expect(isFlatDiscount('Percentage')).toBe(false);
      expect(isFlatDiscount(null)).toBe(false);
    });

    it('normalizes discount types to canonical values', () => {
      expect(normalizeDiscountType('PERCENTAGE')).toBe('PERCENTAGE');
      expect(normalizeDiscountType('Percentage')).toBe('PERCENTAGE');
      expect(normalizeDiscountType('%')).toBe('PERCENTAGE');
      expect(normalizeDiscountType('FLAT')).toBe('FLAT');
      expect(normalizeDiscountType('Flat')).toBe('FLAT');
      expect(normalizeDiscountType('Fixed Amount')).toBe('FLAT');
      expect(normalizeDiscountType('₹')).toBe('FLAT');
      expect(normalizeDiscountType('')).toBeNull();
      expect(normalizeDiscountType(null)).toBeNull();
    });
  });

  describe('validateDiscount', () => {
    it('accepts valid percentage and flat discounts', () => {
      expect(validateDiscount(100, 'PERCENTAGE', 10)).toBeNull();
      expect(validateDiscount(100, 'FLAT', 10)).toBeNull();
      expect(validateDiscount(35, 'FLAT', 5)).toBeNull();
      expect(validateDiscount(35, 'PERCENTAGE', 5)).toBeNull();
      expect(validateDiscount(100, 'PERCENTAGE', 100)).toBeNull();
      expect(validateDiscount(100, 'FLAT', 100)).toBeNull();
      expect(validateDiscount(100, 'PERCENTAGE', 0)).toBeNull();
      expect(validateDiscount(100, 'FLAT', 0)).toBeNull();
    });

    it('rejects negative MRP', () => {
      expect(validateDiscount(-10, 'FLAT', 5)).toBe('MRP cannot be negative.');
    });

    it('rejects negative discount value', () => {
      expect(validateDiscount(100, 'FLAT', -5)).toBe('Discount value cannot be negative.');
      expect(validateDiscount(100, 'PERCENTAGE', -10)).toBe('Discount value cannot be negative.');
    });

    it('rejects percentage discount greater than 100%', () => {
      expect(validateDiscount(100, 'PERCENTAGE', 105)).toBe('Percentage discount cannot exceed 100%.');
      expect(validateDiscount(100, 'Percentage', 150)).toBe('Percentage discount cannot exceed 100%.');
    });

    it('rejects flat discount exceeding MRP', () => {
      expect(validateDiscount(35, 'FLAT', 50)).toBe('Flat discount cannot exceed MRP.');
      expect(validateDiscount(35, 'Fixed Amount', 40)).toBe('Flat discount cannot exceed MRP.');
    });
  });
});
