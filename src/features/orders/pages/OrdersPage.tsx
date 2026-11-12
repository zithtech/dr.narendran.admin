import {
  Eye,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import React, { useState } from 'react';

import { type Column, DataView, type Facet } from '../../../components/ui/DataView';
import { addedFacet } from '../../../components/ui/facets';
import { PrimaryAvatarCell } from '../../../components/ui/CommonTable';
import { useResource } from '../../../hooks/useResource';
import { titleCase } from '../../../lib/format';
import { OrderDetailsDrawer } from '../components/OrderDetailsDrawer';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { UpdateOrderStatusModal } from '../components/UpdateOrderStatusModal';
import type { OrderListItem } from '../types/orders';

function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const FACETS: Facet<OrderListItem>[] = [
  {
    id: 'status',
    label: 'Status',
    allLabel: 'All statuses',
    value: (o) => o.status,
    optionLabel: (v) => titleCase(v.replace('_', ' ')),
    order: ['placed', 'processing', 'packed', 'out_for_delivery', 'dispatched', 'delivered', 'cancelled'],
  },
  {
    id: 'payment',
    label: 'Payment',
    allLabel: 'All payments',
    value: (o) => o.payment_status,
    optionLabel: (v) => titleCase(v),
    order: ['paid', 'pending', 'failed', 'refunded'],
  },
  addedFacet<OrderListItem>(),
];

export const OrdersPage: React.FC = () => {
  const resource = useResource<OrderListItem>('orders?limit=250', 'orders');

  // Drawer & Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statusModalOrder, setStatusModalOrder] = useState<OrderListItem | null>(null);

  const handleOpenDetails = (id: string) => {
    setSelectedOrderId(id);
    setIsDrawerOpen(true);
  };

  const columns: Column<OrderListItem>[] = [
    {
      id: 'order_number',
      header: 'Order Number',
      sort: (o) => o.order_number,
      cell: (o) => (
        <div style={{ minWidth: 0 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetails(o.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              fontWeight: 650,
              fontSize: 13,
              color: '#0f172a',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            className="hover:text-blue-600 hover:underline"
          >
            {o.order_number}
          </button>
          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
            ID: {o.id.slice(0, 8)}…
          </div>
        </div>
      ),
    },
    {
      id: 'patient',
      header: 'Patient',
      sort: (o) => (o.patient?.name || '').toLowerCase(),
      cell: (o) => (
        <PrimaryAvatarCell
          name={o.patient?.name || 'Walk-in Patient'}
          sub={o.patient?.phone || o.patient?.email || <span className="text-slate-400">No contact info</span>}
          avatarSrc={undefined}
          onOpen={() => handleOpenDetails(o.id)}
        />
      ),
    },
    {
      id: 'date',
      header: 'Order Date',
      sort: (o) => new Date(o.created_at).getTime(),
      cell: (o) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 12.5, color: '#0f172a', whiteSpace: 'nowrap' }}>
            {new Date(o.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {new Date(o.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      sort: (o) => o.item_count,
      cell: (o) => (
        <div style={{ minWidth: 0, maxWidth: 160 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#334155',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              padding: '1.5px 7px',
              borderRadius: 5,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
            }}
          >
            {o.item_count} {o.item_count === 1 ? 'item' : 'items'}
          </span>
          {o.medicines_preview && (
            <div
              style={{
                fontSize: 11,
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 2,
              }}
              title={o.medicines_preview}
            >
              {o.medicines_preview}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Total Amount',
      sort: (o) => Number(o.total_amount) || 0,
      cell: (o) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 650, fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(o.total_amount)}
          </div>
          {Boolean(o.delivery_charge) && (
            <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
              incl. ₹{o.delivery_charge} delivery
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'payment_status',
      header: 'Payment Status',
      sort: (o) => o.payment_status,
      cell: (o) => <PaymentStatusBadge status={o.payment_status} />,
    },
    {
      id: 'status',
      header: 'Order Status',
      sort: (o) => o.status,
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      id: 'delivery',
      header: 'Delivery',
      sort: (o) => o.delivery_address || '',
      cell: (o) => (
        <div style={{ minWidth: 0, maxWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#334155' }}>
            <Truck size={12.5} style={{ color: '#64748b', flexShrink: 0 }} />
            <span>Home Delivery</span>
          </div>
          {o.delivery_address && (
            <div
              style={{
                fontSize: 11,
                color: '#94a3b8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 1,
              }}
              title={o.delivery_address}
            >
              {o.delivery_address}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataView
        title="Orders"
        subtitle="Manage patient prescription orders, fulfillment statuses, payment confirmations, and delivery dispatches."
        icon={ShoppingBag}
        noun="order"
        nounPlural="orders"
        resource={resource}
        searchPlaceholder="Search order #, patient name, phone..."
        searchFields={(o) => [o.order_number, o.patient?.name, o.patient?.phone, o.medicines_preview, o.delivery_address]}
        facets={FACETS}
        dateOf={(o) => o.created_at}
        dateLabel="Ordered"
        columns={columns}
        nameOf={(o) => o.order_number}
        onRowClick={(o) => handleOpenDetails(o.id)}
        activeId={selectedOrderId}
        rowActions={(o) => (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}
          >
            <button
              type="button"
              className="ui-btn ui-btn-xs"
              onClick={() => handleOpenDetails(o.id)}
              title="View Details"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Eye size={12} />
              <span>Details</span>
            </button>
            {o.status !== 'delivered' && o.status !== 'cancelled' && (
              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-xs"
                onClick={() => setStatusModalOrder(o)}
                title="Update Status"
              >
                Status
              </button>
            )}
          </div>
        )}
      />

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        orderId={selectedOrderId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedOrderId(null);
        }}
        onOrderUpdated={() => void resource.refresh()}
      />

      {/* Status Update Modal */}
      {statusModalOrder && (
        <UpdateOrderStatusModal
          isOpen={Boolean(statusModalOrder)}
          onClose={() => setStatusModalOrder(null)}
          orderId={statusModalOrder.id}
          orderNumber={statusModalOrder.order_number}
          currentStatus={statusModalOrder.status}
          onSuccess={() => {
            setStatusModalOrder(null);
            void resource.refresh();
          }}
        />
      )}
    </>
  );
};

export default OrdersPage;
