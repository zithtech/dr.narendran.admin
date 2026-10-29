import React from 'react';
import { Badge, type BadgeTone } from '../../../components/ui/primitives';

interface OrderStatusBadgeProps {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  placed: { label: 'Placed', tone: 'blue' },
  processing: { label: 'Processing', tone: 'amber' },
  in_progress: { label: 'Processing', tone: 'amber' },
  packed: { label: 'Packed', tone: 'violet' },
  out_for_delivery: { label: 'Dispatched', tone: 'violet' },
  dispatched: { label: 'Dispatched', tone: 'violet' },
  shipped: { label: 'Dispatched', tone: 'violet' },
  delivered: { label: 'Delivered', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  canceled: { label: 'Cancelled', tone: 'red' },
  return_requested: { label: 'Return Requested', tone: 'amber' },
  returned: { label: 'Returned', tone: 'neutral' },
};

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toLowerCase().trim();
  const config = STATUS_MAP[normalized] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
    tone: 'neutral',
  };

  return <Badge tone={config.tone}>{config.label}</Badge>;
};
