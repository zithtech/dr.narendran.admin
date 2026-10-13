export interface MedicineStrength {
  id: string;
  medicine_id: string;
  medicine_name?: string;
  generic_name?: string | null;
  therapeutic_category?: string | null;
  manufacturer?: string | null;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  strip_count: number;
  tablets_per_strip: number | null;
  total_tablets: number;
  available_quantity: number;
  loose_tablets?: number;
  mrp: number | null;
  discount_type: 'PERCENTAGE' | 'FLAT' | null;
  discount_value: number | null;
  final_price: number | null;
  purchase_price: number | null;
  reorder_level: number;
  variant_code: string | null;
  barcode: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  notes: string | null;
  stock_status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  created_at: string;
  updated_at: string;
}

export interface MedicineStrengthFormData {
  medicineId?: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  tablets_per_strip?: number | null | undefined;
  mrp?: number | null | undefined;
  discount_type?: 'PERCENTAGE' | 'FLAT' | null | undefined;
  discount_value?: number | null | undefined;
  purchase_price?: number | null | undefined;
  reorder_level: number;
  variant_code?: string | null | undefined;
  barcode?: string | null | undefined;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string | null | undefined;
}

export type TransactionType =
  | 'OPENING_STOCK'
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'DISPENSE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'DAMAGED'
  | 'EXPIRED'
  | 'REVERSAL';

export interface StockHistoryItem {
  id: string;
  medicine_strength_id: string;
  medicine_id?: string;
  medicine_name?: string;
  strength?: string;
  strength_unit?: string;
  dosage_form?: string;
  transaction_type: TransactionType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost: number | null;
  reference_number: string | null;
  reason: string | null;
  notes: string | null;
  performed_by: string | null;
  performer_name?: string | null;
  performer_email?: string | null;
  created_at: string;
}

export interface InventorySummary {
  total_active_variants: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_valuation: number;
}
