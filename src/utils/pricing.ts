/**
 * Pricing and discount calculation utilities.
 *
 * Rules:
 * - FLAT discount: finalPrice = mrp - discountValue
 * - PERCENT discount: finalPrice = mrp - (mrp * discountValue / 100)
 * - Rounding: round to 2 decimal places
 * - Validations:
 *   - MRP and discountValue must not be negative
 *   - Percentage discounts must be within 0 - 100
 *   - Flat discounts must not exceed MRP
 */

export type NormalizedDiscountType = 'PERCENTAGE' | 'FLAT';

/**
 * Checks if a given discount type represents a percentage discount.
 * Handles case-insensitivity and variations ('PERCENTAGE', 'Percentage', 'percent', '%').
 */
export function isPercentageDiscount(type?: string | null): boolean {
  if (!type) return false;
  const s = String(type).trim().toUpperCase();
  return s.includes('PERCENT') || s === '%';
}

/**
 * Checks if a given discount type represents a flat/fixed amount discount.
 * Handles case-insensitivity and variations ('FLAT', 'Flat', 'Fixed Amount', 'FIXED', '₹').
 */
export function isFlatDiscount(type?: string | null): boolean {
  if (!type) return false;
  const s = String(type).trim().toUpperCase();
  return s.includes('FLAT') || s.includes('FIXED') || s.includes('AMOUNT') || s === '₹';
}

/**
 * Normalizes any supported discount type string into 'PERCENTAGE' | 'FLAT' | null.
 */
export function normalizeDiscountType(raw?: string | null): NormalizedDiscountType | null {
  if (!raw) return null;
  if (isPercentageDiscount(raw)) return 'PERCENTAGE';
  if (isFlatDiscount(raw)) return 'FLAT';
  return null;
}

/**
 * Calculates final price after discount.
 * - Flat discount: mrp - discountValue
 * - Percentage discount: mrp - (mrp * discountValue / 100)
 * - Rounds to 2 decimal places.
 * - Clamps minimum price to 0.
 */
export function calculateFinalPrice(
  mrp?: number | null,
  discountType?: string | null,
  discountValue?: number | null,
): number | null {
  if (mrp === undefined || mrp === null || isNaN(mrp)) {
    return null;
  }

  const numericMrp = Number(mrp);
  if (numericMrp < 0) {
    return null;
  }

  if (
    !discountType ||
    discountValue === undefined ||
    discountValue === null ||
    isNaN(discountValue) ||
    Number(discountValue) <= 0
  ) {
    return Number(numericMrp.toFixed(2));
  }

  const numDiscount = Number(discountValue);

  if (isPercentageDiscount(discountType)) {
    const finalPrice = numericMrp - (numericMrp * numDiscount) / 100;
    return Number(Math.max(0, finalPrice).toFixed(2));
  }

  if (isFlatDiscount(discountType)) {
    const finalPrice = numericMrp - numDiscount;
    return Number(Math.max(0, finalPrice).toFixed(2));
  }

  return Number(numericMrp.toFixed(2));
}

/**
 * Validates pricing inputs according to business rules.
 * Returns null if valid, or an error string if invalid.
 */
export function validateDiscount(
  mrp?: number | null,
  discountType?: string | null,
  discountValue?: number | null,
): string | null {
  if (mrp !== undefined && mrp !== null && !isNaN(mrp) && mrp < 0) {
    return 'MRP cannot be negative.';
  }

  if (
    discountValue !== undefined &&
    discountValue !== null &&
    !isNaN(discountValue) &&
    discountValue < 0
  ) {
    return 'Discount value cannot be negative.';
  }

  if (discountType && discountValue !== undefined && discountValue !== null && !isNaN(discountValue) && discountValue > 0) {
    if (isPercentageDiscount(discountType)) {
      if (discountValue > 100) {
        return 'Percentage discount cannot exceed 100%.';
      }
    } else if (isFlatDiscount(discountType)) {
      if (mrp !== undefined && mrp !== null && !isNaN(mrp) && discountValue > mrp) {
        return 'Flat discount cannot exceed MRP.';
      }
    }
  }

  return null;
}
