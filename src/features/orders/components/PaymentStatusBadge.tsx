import React from 'react';

import { Badge, type BadgeTone } from '../../../components/ui/primitives';

interface PaymentStatusBadgeProps {
  status: string;
}

const PAYMENT_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'green' },
  success: { label: 'Paid', tone: 'green' },
  pending: { label: 'Pending', tone: 'amber' },
  failed: { label: 'Failed', tone: 'red' },
  user_dropped: { label: 'Failed', tone: 'red' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toLowerCase().trim();
  const config = PAYMENT_MAP[normalized] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending',
    tone: 'neutral',
  };

  return <Badge tone={config.tone}>{config.label}</Badge>;
};
