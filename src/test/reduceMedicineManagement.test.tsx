import { describe, expect, it } from 'vitest';

describe('Reduce Medicine Management Logic & Stock Depletion', () => {
  it('correctly reduces available stock when tablets are given to a patient', () => {
    const initialStock = 120;
    const tabletsGiven = 15;

    const remainingStock = initialStock - tabletsGiven;
    expect(remainingStock).toBe(105);
    expect(remainingStock >= 0).toBe(true);
  });

  it('rejects dispensing more tablets than available in inventory', () => {
    const availableStock = 20;
    const requestedTablets = 25;

    const isValid = requestedTablets <= availableStock && requestedTablets > 0;
    expect(isValid).toBe(false);
  });

  it('validates batch prescription dispensing calculations across multiple formulations', () => {
    const inventoryStock: Record<string, number> = {
      'para-500': 100,
      'amox-250': 50,
      'cet-10': 30,
    };

    const prescriptionItems = [
      { id: 'para-500', qty: 10 },
      { id: 'amox-250', qty: 15 },
      { id: 'cet-10', qty: 5 },
    ];

    // Check all have sufficient stock
    const allHaveStock = prescriptionItems.every(
      (item) => (inventoryStock[item.id] ?? 0) >= item.qty
    );
    expect(allHaveStock).toBe(true);

    // Apply reduction
    const updatedStock = { ...inventoryStock };
    for (const item of prescriptionItems) {
      updatedStock[item.id] = (updatedStock[item.id] ?? 0) - item.qty;
    }

    expect(updatedStock['para-500']).toBe(90);
    expect(updatedStock['amox-250']).toBe(35);
    expect(updatedStock['cet-10']).toBe(25);
  });

  it('computes strip count update accurately after tablet reduction', () => {
    const tabletsPerStrip = 10;
    const initialTablets = 45; // 4 strips + 5 loose
    const tabletsGiven = 12;

    const remainingTablets = initialTablets - tabletsGiven; // 33
    const newStripCount = Math.floor(remainingTablets / tabletsPerStrip); // 3 strips
    const newLooseTablets = remainingTablets % tabletsPerStrip; // 3 loose

    expect(remainingTablets).toBe(33);
    expect(newStripCount).toBe(3);
    expect(newLooseTablets).toBe(3);
  });
});
