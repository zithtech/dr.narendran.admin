export type OrderStatus =
  | 'placed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'cancelled';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export type DeliveryMethodType = 'courier' | 'pharmacy_delivery';

export interface CourierDetails {
  courier_name: string;
  tracking_number: string;
  tracking_url?: string | null;
  courier_phone?: string | null;
}

export interface PharmacyDeliveryDetails {
  delivery_person_name: string;
  delivery_person_phone: string;
}

export interface OrderDeliveryInfo {
  delivery_method: string | null;
  delivery_address: {
    full_address: string;
    lat: string | null;
    lng: string | null;
    city: string | null;
    pincode: string | null;
    state: string | null;
  };
  // Third-party Courier details
  courier_name?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  courier_phone?: string | null;
  // Pharmacy Delivery person details
  delivery_person_name?: string | null;
  delivery_person_phone?: string | null;
  // ETA & Delay management
  estimated_delivery_time?: string | null;
  delay_remarks?: string | null;
  status?: string | null;
  // Nested structure support
  courier?: Partial<CourierDetails> | null;
  courier_details?: Partial<CourierDetails> | null;
  delivery_person?: Partial<PharmacyDeliveryDetails> | null;
  pharmacy_delivery?: Partial<PharmacyDeliveryDetails> | null;
}

export interface UpdateDeliveryPayload {
  delivery_method?: DeliveryMethodType | (string & {}) | undefined;
  courier_name?: string | null | undefined;
  tracking_number?: string | null | undefined;
  tracking_url?: string | null | undefined;
  courier_phone?: string | null | undefined;
  delivery_person_name?: string | null | undefined;
  delivery_person_phone?: string | null | undefined;
  estimated_delivery_time?: string | null | undefined;
  delay_remarks?: string | null | undefined;
}

export interface PatientSummary {
  id: string | null;
  name: string;
  phone: string;
  email: string;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_group?: string | null;
}

export interface OrderListItem {
  id: string;
  order_number: string;
  total_amount: number;
  medicine_cost: number;
  delivery_charge: number;
  status: string;
  payment_status: string;
  item_count: number;
  medicines_preview: string;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  patient: PatientSummary | null;
}

export interface OrderItemDetail {
  id: string | number;
  medicine_id: string | null;
  name: string;
  strength: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  dosage_instruction: string;
  duration: string;
}

export interface OrderTimelineLog {
  id: number;
  status: string;
  raw_status: string;
  date: string;
  time: string;
  notes: string | null;
  admin_id: string | null;
  admin_name: string | null;
}

export interface OrderPaymentDetail {
  id: string;
  cf_order_id: string | null;
  cf_payment_id: string | null;
  payment_session_id: string | null;
  payment_method: string | null;
  bank_reference: string | null;
  payment_time: string | null;
  amount: number;
  currency: string;
  status: string;
  refund_id: string | null;
  refund_amount: number | null;
  refund_status: string | null;
  failure_reason: string | null;
}

export interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  pricing: {
    subtotal: number;
    medicine_cost: number;
    discounts: number;
    delivery_charge: number;
    total_amount: number;
  };
  patient: PatientSummary | null;
  prescription: {
    id: string;
    prescription_date: string;
    prescription_type: string;
    doctor: {
      id: string | null;
      name: string | null;
      specialization: string | null;
    } | null;
    prescription_url: string | null;
  } | null;
  delivery: OrderDeliveryInfo;
  medicines: OrderItemDetail[];
  payment: OrderPaymentDetail | null;
  status_timeline: OrderTimelineLog[];
}

export interface OrderStatusCounts {
  placed: number;
  processing: number;
  packed: number;
  out_for_delivery: number;
  delivered: number;
  cancelled: number;
}

export interface PaymentStatusCounts {
  paid: number;
  pending: number;
  failed: number;
  refunded: number;
}

export interface DashboardSummaryMetrics {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  statusCounts: OrderStatusCounts;
  paymentCounts: PaymentStatusCounts;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListOrdersQuery {
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: ('createdAt' | 'totalAmount' | 'orderNumber' | 'status' | 'paymentStatus') | undefined;
  sortOrder?: ('asc' | 'desc') | undefined;
  search?: string | undefined;
  status?: string | undefined;
  paymentStatus?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  placed: ['processing', 'cancelled'],
  processing: ['packed', 'shipped', 'out_for_delivery', 'cancelled'],
  packed: ['shipped', 'out_for_delivery', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'delivery_failed', 'cancelled'],
  dispatched: ['out_for_delivery', 'delivered', 'delivery_failed', 'cancelled'],
  out_for_delivery: ['delivered', 'delivery_failed', 'cancelled'],
  delivery_failed: ['out_for_delivery', 'shipped', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; tone: 'blue' | 'amber' | 'indigo' | 'purple' | 'green' | 'rose' | 'slate' }
> = {
  placed: { label: 'Placed', tone: 'blue' },
  processing: { label: 'Processing', tone: 'amber' },
  packed: { label: 'Packed', tone: 'indigo' },
  shipped: { label: 'Shipped', tone: 'purple' },
  out_for_delivery: { label: 'Out for Delivery', tone: 'purple' },
  dispatched: { label: 'Dispatched', tone: 'purple' },
  delivered: { label: 'Delivered', tone: 'green' },
  delivery_failed: { label: 'Delivery Failed', tone: 'rose' },
  cancelled: { label: 'Cancelled', tone: 'rose' },
  return_requested: { label: 'Return Requested', tone: 'amber' },
  returned: { label: 'Returned', tone: 'slate' },
};

export const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; tone: 'green' | 'amber' | 'rose' | 'slate' }
> = {
  paid: { label: 'Paid', tone: 'green' },
  pending: { label: 'Pending', tone: 'amber' },
  failed: { label: 'Failed', tone: 'rose' },
  refunded: { label: 'Refunded', tone: 'slate' },
};
