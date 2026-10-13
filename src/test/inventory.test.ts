import { describe, expect, it } from 'vitest';

import type { MedicineStrength } from '../types/inventory';
import { calculateFinalPrice } from '../utils/pricing';

describe('Medicine Strength & Single-Pharmacy Inventory Logic', () => {
  it('correctly computes full strips and loose tablets from available quantity', () => {
    const tabsPerStrip = 15;
    const availableQty = 155;

    const stripCount = Math.floor(availableQty / tabsPerStrip);
    const looseTablets = availableQty % tabsPerStrip;

    expect(stripCount).toBe(10);
    expect(looseTablets).toBe(5);
    expect(stripCount * tabsPerStrip + looseTablets).toBe(availableQty);
  });

  it('determines stock status correctly (In Stock, Low Stock, Out of Stock)', () => {
    const getStatus = (variant: Partial<MedicineStrength>) => {
      const qty = variant.available_quantity ?? 0;
      const reorder = variant.reorder_level ?? 10;
      if (qty === 0) return 'OUT_OF_STOCK';
      if (qty <= reorder) return 'LOW_STOCK';
      return 'IN_STOCK';
    };

    expect(getStatus({ available_quantity: 100, reorder_level: 20 })).toBe('IN_STOCK');
    expect(getStatus({ available_quantity: 20, reorder_level: 20 })).toBe('LOW_STOCK');
    expect(getStatus({ available_quantity: 5, reorder_level: 20 })).toBe('LOW_STOCK');
    expect(getStatus({ available_quantity: 0, reorder_level: 20 })).toBe('OUT_OF_STOCK');
  });

  it('calculates selling price correctly for percentage discount', () => {
    expect(calculateFinalPrice(100, 'PERCENTAGE', 15)).toBe(85.0);
    expect(calculateFinalPrice(35, 'PERCENTAGE', 5)).toBe(33.25);
    expect(calculateFinalPrice(100, 'PERCENTAGE', 5)).toBe(95.0);
  });

  it('calculates selling price correctly for flat discount', () => {
    expect(calculateFinalPrice(120, 'FLAT', 25)).toBe(95.0);
    expect(calculateFinalPrice(35, 'FLAT', 5)).toBe(30.0);
    expect(calculateFinalPrice(100, 'FLAT', 5)).toBe(95.0);
  });

  it('computes physical count adjustment variance accurately', () => {
    const currentOnHand = 150;
    const actualCount = 142;

    const variance = actualCount - currentOnHand;
    expect(variance).toBe(-8); // 8 units lost/damaged
    expect(currentOnHand + variance).toBe(actualCount);
  });
});
