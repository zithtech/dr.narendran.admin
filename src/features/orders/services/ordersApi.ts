import api from '../../../utils/api';
import type {
  CourierDetails,
  DashboardSummaryMetrics,
  DeliveryMethodType,
  ListOrdersQuery,
  OrderDeliveryInfo,
  OrderDetails,
  OrderListItem,
  PaginationMeta,
  PharmacyDeliveryDetails,
  UpdateDeliveryPayload,
} from '../types/orders';

export const ordersApi = {
  /**
   * Fetch live dashboard metrics for pharmacy orders.
   */
  async getSummaryMetrics(): Promise<DashboardSummaryMetrics> {
    const res = await api.get<{ status: string; data: DashboardSummaryMetrics }>('orders/summary');
    return res.data.data;
  },

  /**
   * Fetch paginated orders listing with search and filters.
   */
  async getOrders(params?: ListOrdersQuery): Promise<{
    orders: OrderListItem[];
    pagination: PaginationMeta;
    summary?: any;
  }> {
    const queryParams: Record<string, any> = {};

    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.search?.trim()) queryParams.search = params.search.trim();
    if (params?.status && params.status !== 'ALL') queryParams.status = params.status;
    if (params?.paymentStatus && params.paymentStatus !== 'ALL')
      queryParams.paymentStatus = params.paymentStatus;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;

    const res = await api.get<{
      status: string;
      data: OrderListItem[];
      pagination: PaginationMeta;
      summary?: any;
    }>('orders', { params: queryParams });

    return {
      orders: res.data.data || [],
      pagination: res.data.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 10,
        total: res.data.data?.length || 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      summary: res.data.summary,
    };
  },

  /**
   * Fetch full order details by order ID or order number.
   */
  async getOrderById(orderId: string): Promise<OrderDetails> {
    const res = await api.get<{ status: string; data: OrderDetails }>(`orders/${encodeURIComponent(orderId)}`);
    return res.data.data;
  },

  /**
   * Transition an order to a new status with optional cancellation reason/notes.
   */
  async updateOrderStatus(
    orderId: string,
    data: {
      status: string;
      cancellation_reason?: string | undefined;
      notes?: string | undefined;
    }
  ): Promise<{
    success: boolean;
    orderId: string;
    orderNumber: string;
    previousStatus: string;
    status: string;
    cancellation_reason: string | null;
  }> {
    const res = await api.patch<{
      status: string;
      data: {
        success: boolean;
        orderId: string;
        orderNumber: string;
        previousStatus: string;
        status: string;
        cancellation_reason: string | null;
      };
    }>(`orders/${encodeURIComponent(orderId)}/status`, data);
    return res.data.data;
  },

  /**
   * Fetch order delivery details by order ID.
   * If dedicated /delivery endpoint is unavailable, falls back to full order lookup.
   */
  async getDeliveryDetails(orderId: string): Promise<OrderDeliveryInfo> {
    try {
      const res = await api.get<{ status: string; data: OrderDeliveryInfo }>(
        `orders/${encodeURIComponent(orderId)}/delivery`
      );
      return res.data.data;
    } catch {
      const order = await this.getOrderById(orderId);
      return order.delivery;
    }
  },

  /**
   * Update delivery information (delivery method, courier/rider, ETA, delay remarks).
   */
  async updateDelivery(
    orderId: string,
    data: UpdateDeliveryPayload
  ): Promise<OrderDeliveryInfo> {
    const res = await api.patch<{ status: string; data: OrderDeliveryInfo }>(
      `orders/${encodeURIComponent(orderId)}/delivery`,
      data
    );
    return res.data.data;
  },

  /**
   * Explicitly update the assigned delivery method for an order.
   */
  async updateDeliveryMethod(
    orderId: string,
    delivery_method: DeliveryMethodType | (string & {})
  ): Promise<OrderDeliveryInfo> {
    return this.updateDelivery(orderId, { delivery_method });
  },

  /**
   * Save or edit Third-party Courier tracking and contact details.
   */
  async saveCourierDetails(
    orderId: string,
    courier: CourierDetails
  ): Promise<OrderDeliveryInfo> {
    return this.updateDelivery(orderId, {
      delivery_method: 'courier',
      courier_name: courier.courier_name,
      tracking_number: courier.tracking_number,
      tracking_url: courier.tracking_url,
      courier_phone: courier.courier_phone,
    });
  },

  /**
   * Save or edit Pharmacy Delivery person (rider) details.
   */
  async savePharmacyDeliveryDetails(
    orderId: string,
    pharmacy: PharmacyDeliveryDetails
  ): Promise<OrderDeliveryInfo> {
    return this.updateDelivery(orderId, {
      delivery_method: 'pharmacy_delivery',
      delivery_person_name: pharmacy.delivery_person_name,
      delivery_person_phone: pharmacy.delivery_person_phone,
    });
  },

  /**
   * Update the estimated delivery date/time and optional delay remarks.
   */
  async updateDeliveryEta(
    orderId: string,
    data: { estimated_delivery_time: string; delay_remarks?: string }
  ): Promise<OrderDeliveryInfo> {
    return this.updateDelivery(orderId, data);
  },
};
