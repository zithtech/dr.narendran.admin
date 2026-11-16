import {
  AlertTriangle,
  Barcode,
  Boxes,
  CheckCircle,
  Clock,
  ExternalLink,
  History,
  IndianRupee,
  PackageMinus,
  PackagePlus,
  PackageX,
  Pencil,
  Pill,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { usePermission } from '../context/PermissionContext';
import { formatDate, timeAgo } from '../lib/format';
import type { MedicineStrength, StockHistoryItem } from '../types/inventory';
import api from '../utils/api';
import { isPercentageDiscount } from '../utils/pricing';
import { Drawer } from './ui/Drawer';

function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface MedicineInventoryDrawerProps {
  variant: MedicineStrength | null;
  onClose: () => void;
  onStockIn?: (variant: MedicineStrength) => void;
  onStockOut?: (variant: MedicineStrength) => void;
  onAdjust?: (variant: MedicineStrength) => void;
  onHistory?: (variant: MedicineStrength) => void;
  onEdit?: (variant: MedicineStrength) => void;
}

export default function MedicineInventoryDrawer({
  variant,
  onClose,
  onStockIn,
  onStockOut,
  onAdjust,
  onHistory,
  onEdit,
}: MedicineInventoryDrawerProps) {
  const navigate = useNavigate();
  const { canUpdate, canView } = usePermission();
  const isInvUpdatable = canUpdate('INVENTORY');
  const isPharmViewable = canView('PHARMACY');

  // Recent stock transactions ledger preview
  const [recentHistory, setRecentHistory] = useState<StockHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);

  useEffect(() => {
    if (!variant?.id) {
      setRecentHistory([]);
      setHistoryTotal(0);
      return;
    }

    let isMounted = true;
    const fetchRecentHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await api.get<{
          items: StockHistoryItem[];
          total: number;
        }>(`inventory/${variant.id}/history`, {
          params: { page: 1, limit: 5 },
        });
        if (isMounted) {
          setRecentHistory(res.data.items || []);
          setHistoryTotal(res.data.total || 0);
        }
      } catch {
        if (isMounted) {
          setRecentHistory([]);
          setHistoryTotal(0);
        }
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };

    void fetchRecentHistory();

    return () => {
      isMounted = false;
    };
  }, [variant?.id, variant?.available_quantity]);

  if (!variant) return null;

  const isActive = variant.status === 'ACTIVE';
  const hasStripPack = Boolean(variant.tablets_per_strip && variant.tablets_per_strip > 0);
  const isOutOfStock = variant.available_quantity === 0;
  const isLowStock = !isOutOfStock && variant.available_quantity <= variant.reorder_level;

  const discountBadge =
    variant.discount_type &&
    variant.discount_value !== null &&
    variant.discount_value !== undefined &&
    Number(variant.discount_value) > 0
      ? isPercentageDiscount(variant.discount_type)
        ? `${variant.discount_value}% OFF`
        : `₹${variant.discount_value} OFF`
      : null;

  // Valuation
  const unitValuationPrice =
    variant.purchase_price !== null && variant.purchase_price !== undefined
      ? Number(variant.purchase_price)
      : variant.final_price !== null && variant.final_price !== undefined
        ? Number(variant.final_price)
        : Number(variant.mrp ?? 0);
  const totalValuation = (variant.available_quantity || 0) * unitValuationPrice;

  // Margin
  const purchasePriceNum =
    variant.purchase_price !== null && variant.purchase_price !== undefined
      ? Number(variant.purchase_price)
      : null;
  const finalPriceNum =
    variant.final_price !== null && variant.final_price !== undefined
      ? Number(variant.final_price)
      : null;
  const profitPerUnit =
    purchasePriceNum !== null && finalPriceNum !== null ? finalPriceNum - purchasePriceNum : null;
  const marginPercent =
    purchasePriceNum && purchasePriceNum > 0 && profitPerUnit !== null
      ? (profitPerUnit / purchasePriceNum) * 100
      : null;

  const renderStockBadge = () => {
    let bg = '#f0fdf4';
    let fg = '#166534';
    let border = '#dcfce7';
    let dot = '#22c55e';
    let label = 'In Stock';

    if (isOutOfStock) {
      bg = '#fef2f2';
      fg = '#991b1b';
      border = '#fee2e2';
      dot = '#ef4444';
      label = 'Out of Stock';
    } else if (isLowStock) {
      bg = '#fffbeb';
      fg = '#92400e';
      border = '#fef3c7';
      dot = '#d97706';
      label = `Low Stock (≤ ${variant.reorder_level})`;
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 9px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 650,
          background: bg,
          color: fg,
          border: `1px solid ${border}`,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dot,
            flexShrink: 0,
          }}
        />
        <span>{label}</span>
      </span>
    );
  };

  const renderTransactionBadge = (type: string) => {
    let bg = '#eff6ff';
    let fg = '#1d4ed8';
    let border = '#dbeafe';

    switch (type) {
      case 'STOCK_IN':
      case 'OPENING_STOCK':
      case 'RETURN':
        bg = '#f0fdf4';
        fg = '#166534';
        border = '#dcfce7';
        break;
      case 'STOCK_OUT':
      case 'DISPENSE':
        bg = '#fffbeb';
        fg = '#92400e';
        border = '#fef3c7';
        break;
      case 'DAMAGED':
      case 'EXPIRED':
        bg = '#fef2f2';
        fg = '#991b1b';
        border = '#fee2e2';
        break;
      case 'ADJUSTMENT':
        bg = '#eff6ff';
        fg = '#1d4ed8';
        border = '#dbeafe';
        break;
      default:
        bg = '#f8fafc';
        fg = '#475569';
        border = '#e2e8f0';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 7px',
          borderRadius: 5,
          fontSize: 11,
          fontWeight: 700,
          background: bg,
          color: fg,
          border: `1px solid ${border}`,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
        }}
      >
        {type.replace(/_/g, ' ')}
      </span>
    );
  };

  const hero = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.22)',
            flexShrink: 0,
          }}
        >
          <Pill size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2
              style={{
                fontSize: 17.5,
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {variant.medicine_name || 'Medicine Formulation'}
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#1d4ed8',
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                padding: '2px 7px',
                borderRadius: 5,
              }}
            >
              {variant.strength} {variant.strength_unit}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#475569',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '2px 7px',
                borderRadius: 5,
              }}
            >
              {variant.dosage_form}
            </span>
            {discountBadge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#b45309',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '2px 7px',
                  borderRadius: 5,
                }}
              >
                {discountBadge}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
            {variant.generic_name ? `${variant.generic_name}` : ''}
            {variant.manufacturer ? ` · ${variant.manufacturer}` : ''}
          </div>
        </div>
      </div>
      <div>{renderStockBadge()}</div>
    </div>
  );

  const stats = [
    {
      label: 'Available Stock',
      value: (
        <span
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#16a34a',
          }}
        >
          {variant.available_quantity} units
        </span>
      ),
      icon: isOutOfStock ? (
        <PackageX size={12} style={{ color: '#dc2626' }} />
      ) : isLowStock ? (
        <AlertTriangle size={12} style={{ color: '#d97706' }} />
      ) : (
        <CheckCircle size={12} style={{ color: '#16a34a' }} />
      ),
    },
    {
      label: 'Selling Price',
      value: (
        <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
          {variant.final_price !== null ? formatCurrency(variant.final_price) : '—'}
        </span>
      ),
    },
    {
      label: 'Stock Valuation',
      value: (
        <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
          {formatCurrency(totalValuation)}
        </span>
      ),
    },
    {
      label: 'Reorder Level',
      value: (
        <span style={{ fontWeight: 650, color: '#475569', fontSize: 13 }}>
          ≤ {variant.reorder_level} units
        </span>
      ),
    },
  ];

  const footer = (
    <div
      style={{
        display: 'flex',
        gap: 10,
        width: '100%',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {onHistory && (
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          style={{
            fontSize: 12.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 35,
            padding: '0 13px',
            fontWeight: 600,
          }}
          onClick={() => onHistory(variant)}
          title="View full audit movement history"
        >
          <History size={14} style={{ color: '#64748b' }} />
          <span>Ledger</span>
        </button>
      )}

      {isPharmViewable && (
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          style={{
            fontSize: 12.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 35,
            padding: '0 13px',
            fontWeight: 600,
          }}
          onClick={() => {
            onClose();
            navigate(`/pharmacy?search=${encodeURIComponent(variant.medicine_name || '')}`);
          }}
          title="Open Master Medicine in Pharmacy"
        >
          <ExternalLink size={13} style={{ color: '#64748b' }} />
          <span>Pharmacy Master</span>
        </button>
      )}

      {isInvUpdatable && onAdjust && (
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          style={{
            fontSize: 12.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 35,
            padding: '0 13px',
            fontWeight: 600,
          }}
          onClick={() => onAdjust(variant)}
          title="Reconcile physical stock count"
        >
          <Scale size={14} style={{ color: '#64748b' }} />
          <span>Adjust</span>
        </button>
      )}

      {isInvUpdatable && onStockOut && (
        <button
          type="button"
          className="ui-btn ui-btn-neutral"
          style={{
            fontSize: 12.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 35,
            padding: '0 13px',
            fontWeight: 600,
          }}
          onClick={() => onStockOut(variant)}
          title="Issue / Dispense stock"
        >
          <PackageMinus size={14} style={{ color: '#64748b' }} />
          <span>Stock Out</span>
        </button>
      )}

      {isInvUpdatable && onStockIn && (
        <button
          type="button"
          className="ui-btn"
          style={{
            fontSize: 12.5,
            background: '#ffffff',
            color: '#166534',
            border: '1px solid #bbf7d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            padding: '0 13px',
            height: 35,
            cursor: 'pointer',
            fontWeight: 600,
          }}
          onClick={() => onStockIn(variant)}
          title="Receive fresh batch stock"
        >
          <PackagePlus size={14} style={{ color: '#16a34a' }} />
          <span>Stock In</span>
        </button>
      )}

      {isInvUpdatable && onEdit && (
        <button
          type="button"
          className="ui-btn"
          style={{
            fontSize: 12.5,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            padding: '0 16px',
            height: 35,
            cursor: 'pointer',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.28)',
          }}
          onClick={() => onEdit(variant)}
          title="Edit formulation parameters"
        >
          <Pencil size={14} />
          <span>Edit Variant</span>
        </button>
      )}

      <button
        type="button"
        className="ui-btn ui-btn-neutral"
        onClick={onClose}
        style={{ fontSize: 12.5, height: 35, padding: '0 14px' }}
      >
        Close
      </button>
    </div>
  );

  return (
    <Drawer
      open={Boolean(variant)}
      onClose={onClose}
      label="Medicine Inventory Record"
      hero={hero}
      stats={stats}
      footer={footer}
      size="lg"
      className="medicine-inventory-view-drawer"
      width="min(740px, 100vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Physical Stock & Packaging Breakdown Card */}
        <div className="appt-view-card">
          <div className="appt-view-header">
            <div className="appt-view-badge">
              <Boxes size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
            </div>
            <div>
              <div className="appt-view-title">Physical Stock & Packaging Status</div>
              <div className="appt-view-subtitle">Package configuration, strip counts, and physical balance</div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
              fontSize: 12.5,
            }}
          >
            <div className="appt-view-item">
              <span className="appt-view-label">Packaging Format</span>
              <span className="appt-view-val" style={{ fontWeight: 650 }}>
                {hasStripPack ? `Pack of ${variant.tablets_per_strip} units` : 'Single unit item'}
              </span>
            </div>

            {hasStripPack ? (
              <>
                <div className="appt-view-item">
                  <span className="appt-view-label">Full Strips Count</span>
                  <span className="appt-view-val" style={{ fontWeight: 700, color: '#1d4ed8' }}>
                    {variant.strip_count ?? Math.floor(variant.available_quantity / (variant.tablets_per_strip || 1))} strips
                  </span>
                </div>

                <div className="appt-view-item">
                  <span className="appt-view-label">Loose Tablets</span>
                  <span className="appt-view-val" style={{ fontWeight: 650 }}>
                    {variant.loose_tablets ?? (variant.available_quantity % (variant.tablets_per_strip || 1))} units
                  </span>
                </div>
              </>
            ) : null}

            <div className="appt-view-item">
              <span className="appt-view-label">Supply Health</span>
              <span
                className="appt-view-val"
                style={{
                  fontWeight: 650,
                  color: isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#16a34a',
                }}
              >
                {isOutOfStock ? 'Depleted (Zero Balance)' : isLowStock ? 'Requires Replenishment' : 'Adequate Supply'}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Classification & Specifications Card */}
        <div className="appt-view-card">
          <div className="appt-view-header">
            <div className="appt-view-badge">
              <Pill size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
            </div>
            <div>
              <div className="appt-view-title">Clinical Classification & Specifications</div>
              <div className="appt-view-subtitle">Therapeutic category, manufacturing source, and dispensing instructions</div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
              fontSize: 12.5,
            }}
          >
            <div className="appt-view-item">
              <span className="appt-view-label">Therapeutic Category</span>
              <span className="appt-view-val" style={{ fontWeight: 650 }}>
                {variant.therapeutic_category || <span style={{ color: '#94a3b8' }}>General / Uncategorized</span>}
              </span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Manufacturer / Marketer</span>
              <span className="appt-view-val">
                {variant.manufacturer || <span style={{ color: '#94a3b8' }}>Not recorded</span>}
              </span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Catalog Dispensing Status</span>
              <span
                className="appt-view-val"
                style={{
                  fontWeight: 650,
                  color: isActive ? '#166534' : '#64748b',
                }}
              >
                {isActive ? 'Active for Dispensing' : 'Inactive / Suspended'}
              </span>
            </div>
          </div>

          {variant.notes && (
            <div style={{ marginTop: 2 }}>
              <div style={{ fontSize: 11.5, fontWeight: 650, color: '#475569', marginBottom: 4 }}>
                Dispensing / Clinical Notes:
              </div>
              <div
                style={{
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                {variant.notes}
              </div>
            </div>
          )}
        </div>

        {/* Commercial Pricing & Margins Card */}
        <div className="appt-view-card">
          <div className="appt-view-header">
            <div className="appt-view-badge">
              <IndianRupee size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
            </div>
            <div>
              <div className="appt-view-title">Commercial Pricing & Financials</div>
              <div className="appt-view-subtitle">MRP baseline, discount rate, purchase cost, and gross margins</div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
              fontSize: 12.5,
            }}
          >
            <div className="appt-view-item">
              <span className="appt-view-label">Maximum Retail Price (MRP)</span>
              <span className="appt-view-val" style={{ fontWeight: 650 }}>
                {formatCurrency(variant.mrp)}
              </span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Discount Applied</span>
              <span className="appt-view-val">
                {discountBadge ? (
                  <span style={{ color: '#16a34a', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={12} /> {discountBadge}
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
                      ({isPercentageDiscount(variant.discount_type) ? 'Percentage' : 'Flat rate'})
                    </span>
                  </span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>None (0%)</span>
                )}
              </span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Unit Purchase / Cost Price</span>
              <span className="appt-view-val">
                {variant.purchase_price !== null && variant.purchase_price !== undefined ? (
                  <strong style={{ color: '#0f172a' }}>{formatCurrency(variant.purchase_price)}</strong>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Not recorded</span>
                )}
              </span>
            </div>

            {profitPerUnit !== null ? (
              <div className="appt-view-item">
                <span className="appt-view-label">Estimated Unit Margin</span>
                <span
                  className="appt-view-val"
                  style={{
                    fontWeight: 650,
                    color: profitPerUnit >= 0 ? '#166534' : '#dc2626',
                  }}
                >
                  {formatCurrency(profitPerUnit)}
                  {marginPercent !== null && ` (${marginPercent.toFixed(1)}%)`}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* System Identifiers & Barcode Card */}
        <div className="appt-view-card">
          <div className="appt-view-header">
            <div className="appt-view-badge">
              <Barcode size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
            </div>
            <div>
              <div className="appt-view-title">System Identifiers & Barcode</div>
              <div className="appt-view-subtitle">SKU identifier, physical barcode, and database reference keys</div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
              fontSize: 12.5,
            }}
          >
            <div className="appt-view-item">
              <span className="appt-view-label">Variant SKU Code</span>
              <span className="appt-view-val" style={{ fontFamily: 'monospace', fontWeight: 650 }}>
                {variant.variant_code || <span style={{ color: '#94a3b8' }}>—</span>}
              </span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Barcode / EAN</span>
              <span className="appt-view-val" style={{ fontFamily: 'monospace' }}>
                {variant.barcode || <span style={{ color: '#94a3b8' }}>—</span>}
              </span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Variant ID</span>
              <span className="appt-view-val" style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                {variant.id}
              </span>
            </div>

            <div className="appt-view-item">
              <span className="appt-view-label">Master Medicine ID</span>
              <span className="appt-view-val" style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                {variant.medicine_id}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Stock Movement Ledger Card */}
        <div className="appt-view-card">
          <div className="appt-view-header">
            <div className="appt-view-badge" style={{ background: '#eff6ff' }}>
              <History size={13.5} style={{ color: '#2563eb', display: 'block', margin: 'auto' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div>
                <div className="appt-view-title">Recent Stock Movement Activity</div>
                <div className="appt-view-subtitle">Chronological ledger of inventory updates and balance shifts</div>
              </div>
              {onHistory && (
                <button
                  type="button"
                  onClick={() => onHistory(variant)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#1d4ed8',
                    background: '#eff6ff',
                    border: '1px solid #dbeafe',
                    borderRadius: 6,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <History size={12} /> View Full Ledger ({historyTotal})
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: 12.5 }}>
            {historyLoading ? (
              <div style={{ color: '#64748b' }}>Checking ledger audit records...</div>
            ) : recentHistory.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                No stock transactions logged yet for this formulation variant.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentHistory.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {renderTransactionBadge(item.transaction_type)}
                        <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 12 }}>
                          {item.reason || item.reference_number || 'Stock Movement'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} style={{ color: '#94a3b8' }} />
                        <span>{timeAgo(item.created_at)}</span>
                        {item.performer_name && <span>· by {item.performer_name}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 12.5,
                          color: item.quantity_change > 0 ? '#16a34a' : item.quantity_change < 0 ? '#dc2626' : '#475569',
                        }}
                      >
                        {item.quantity_change > 0 ? `+${item.quantity_change}` : item.quantity_change} units
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>
                        Bal: {item.quantity_before} → {item.quantity_after}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audit Metadata (Matching AppointmentDrawer) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#94a3b8',
            borderTop: '1px solid #f1f5f9',
            paddingTop: 8,
          }}
        >
          <span>Created: {variant.created_at ? formatDate(variant.created_at) : '—'}</span>
          <span>Last Updated: {variant.updated_at ? timeAgo(variant.updated_at) : '—'}</span>
        </div>
      </div>

      <style>{`
        .medicine-inventory-view-drawer {
          width: min(740px, 100vw) !important;
          max-width: 740px !important;
          box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
        }
        .appt-view-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .appt-view-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .appt-view-badge {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin: 0;
        }
        .appt-view-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .appt-view-subtitle {
          font-size: 11px;
          color: #64748b;
          margin-top: 1px;
        }
        .appt-view-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px 8px;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #f1f5f9;
        }
        .appt-view-label {
          font-size: 11px;
          color: #64748b;
        }
        .appt-view-val {
          color: #0f172a;
          font-size: 12.5px;
        }
      `}</style>
    </Drawer>
  );
}

export { MedicineInventoryDrawer };
