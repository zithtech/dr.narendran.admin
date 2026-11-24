import { App, Drawer, Modal as AntModal, Spin } from 'antd';
import dayjs from 'dayjs';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageMinus,
  Pill,
  Printer,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { type Column, DataView, type Facet, PrimaryCell } from '../components/ui/DataView';
import { addedFacet } from '../components/ui/facets';
import { Modal } from '../components/ui/Modal';
import { ActivityCell, Badge, cx } from '../components/ui/primitives';
import { SearchableSelect, type SearchableSelectOption } from '../components/ui/SearchableSelect';
import { usePermission } from '../context/PermissionContext';
import { useResource } from '../hooks/useResource';
import { timeAgo } from '../lib/format';
import type {
  DispensePayload,
  MedicineStrength,
  StockHistoryItem,
} from '../types/inventory';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

interface PatientOption {
  id: string;
  name: string;
  phone?: string | undefined;
  gender?: string | undefined;
}

interface PrescriptionSummary {
  id: string;
  prescription_number?: string | undefined;
  patient_id?: string | undefined;
  patient_name?: string | undefined;
  patient_phone?: string | undefined;
  patient_gender?: string | undefined;
  patient_dob?: string | undefined;
  prescription_date: string;
  diagnosis?: string | undefined;
  additional_notes?: string | undefined;
  doctor?: {
    id?: string | undefined;
    name: string;
    specialization?: string | undefined;
    specialty?: string | undefined;
  } | undefined;
  medicines: Array<{
    id?: string | undefined;
    medicine_id?: string | undefined;
    medicine_name: string;
    strength?: string | undefined;
    dosage?: string | undefined;
    frequency?: string | undefined;
    duration?: string | undefined;
    prescribed_quantity?: number | undefined;
    mrp?: number | null | undefined;
    final_price?: number | null | undefined;
  }>;
}

export interface DispenseBillItem {
  medicineName: string;
  strength?: string | undefined;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | undefined;
  matchedVariantId?: string | null | undefined;
  matchedVariant?: MedicineStrength | null | undefined;
}

export interface DispenseBill {
  billNumber: string;
  billDate: string;
  prescriptionNumber: string;
  prescriptionId: string;
  patientName: string;
  patientId?: string | undefined;
  patientPhone?: string | undefined;
  doctorName?: string | undefined;
  items: DispenseBillItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  referenceNumber?: string | undefined;
  isDispensed?: boolean | undefined;
  dispensedAt?: string | undefined;
}

function getPatientName(item: StockHistoryItem): string {
  if (item.reason && item.reason.includes('(') && item.reason.includes(')')) {
    const matched = item.reason.match(/\(([^)]+)\)/);
    if (matched && matched[1]) return matched[1];
  }
  if (item.notes && item.notes.includes('Patient:')) {
    return item.notes.split('Patient:')[1]?.split('|')[0]?.trim() || 'Clinical / OP';
  }
  return 'Clinical / OP Recipient';
}

function formatDoctorDisplay(raw?: string | null): string {
  if (!raw) return 'Practicing Doctor';
  const trimmed = raw.trim();
  if (/^dr\.?\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
}

const FACETS: Facet<StockHistoryItem>[] = [
  {
    id: 'dosageForm',
    label: 'Dosage Form',
    allLabel: 'All dosage forms',
    value: (item) => item.dosage_form?.trim() || 'Tablet',
  },
  {
    id: 'type',
    label: 'Dispense Type',
    allLabel: 'All types',
    value: (item) => {
      if (item.transaction_type === 'DISPENSE') return 'Patient Dispense';
      if (item.transaction_type === 'STOCK_OUT') return 'Clinic Issue';
      if (item.transaction_type === 'DAMAGED') return 'Damaged';
      if (item.transaction_type === 'EXPIRED') return 'Expired';
      return item.transaction_type;
    },
    order: ['Patient Dispense', 'Clinic Issue', 'Damaged', 'Expired'],
  },
  {
    id: 'performer',
    label: 'Dispensed By',
    allLabel: 'All staff',
    value: (item) => item.performer_name?.trim() || 'Staff User',
  },
  addedFacet<StockHistoryItem>(),
];

const TABS = [
  { id: 'all', label: 'All Reductions' },
  { id: 'dispense', label: 'Patient Dispenses' },
  { id: 'stock_out', label: 'Clinic Issues' },
  { id: 'damaged_expired', label: 'Damaged & Expired' },
];

const DISPENSE_REASON_OPTIONS: SearchableSelectOption[] = [
  {
    value: 'Given to Patient',
    label: 'Given to Patient',
    sublabel: 'Standard in-clinic tablet dispensation to patient',
    badge: 'Routine',
    badgeTone: 'blue',
  },
  {
    value: 'Prescription Fulfilment',
    label: 'Prescription Fulfilment',
    sublabel: 'Dispensing against doctor prescription regimen',
    badge: 'Prescription',
    badgeTone: 'violet',
  },
  {
    value: 'In-Clinic Consultation Dose',
    label: 'In-Clinic Consultation Dose',
    sublabel: 'Immediate tablet administered during consultation',
    badge: 'Clinic',
    badgeTone: 'green',
  },
  {
    value: 'Emergency Treatment',
    label: 'Emergency Treatment',
    sublabel: 'Urgent / acute care or immediate relief dose',
    badge: 'Urgent',
    badgeTone: 'red',
  },
  {
    value: 'OP Ward Issue',
    label: 'OP Ward Issue',
    sublabel: 'Outpatient observation or nursing station issue',
    badge: 'OP Ward',
    badgeTone: 'amber',
  },
  {
    value: 'Sample Given',
    label: 'Sample Given',
    sublabel: 'Physician trial or complimentary dose',
    badge: 'Sample',
    badgeTone: 'neutral',
  },
];

export default function ReduceMedicineManagement() {
  const resource = useResource<StockHistoryItem>(
    'inventory/dispenses?transaction_type=ALL_REDUCTIONS&limit=500',
    'dispense ledger'
  );
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { canCreate, canUpdate } = usePermission();
  const isInvUpdatable = canUpdate('INVENTORY') || canCreate('INVENTORY');

  // Modals & Drawer state
  const [isReduceDrawerOpen, setIsReduceDrawerOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<StockHistoryItem | null>(null);

  // Quick form state for "Reduce Medicine / Give Tablet"
  const [allVariants, setAllVariants] = useState<MedicineStrength[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  const [formVariantId, setFormVariantId] = useState<string>('');
  const [formPatientId, setFormPatientId] = useState<string>('');
  const [formCustomPatientName, setFormCustomPatientName] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formReason, setFormReason] = useState<string>('Given to Patient');
  const [formReferenceNumber, setFormReferenceNumber] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Prescription Dispense Modal State
  const [allPrescriptions, setAllPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [selectedRxId, setSelectedRxId] = useState<string>('');
  const [selectedRx, setSelectedRx] = useState<PrescriptionSummary | null>(null);
  const [rxItemsToDispense, setRxItemsToDispense] = useState<
    Array<{
      medicineName: string;
      strength?: string | undefined;
      prescribedQuantity: number;
      matchedVariantId: string | null;
      matchedVariant?: MedicineStrength | null | undefined;
      unitPrice: number;
      dispenseQuantity: number;
      included: boolean;
      notes?: string | undefined;
    }>
  >([]);
  const [rxSubmitting, setRxSubmitting] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<DispenseBill | null>(null);

  // Load list of all active variants for the dropdown in "Give Tablet" modal
  const loadAllVariants = useCallback(async () => {
    setVariantsLoading(true);
    try {
      const res = await api.get<{
        success?: boolean;
        items?: MedicineStrength[];
        data?: MedicineStrength[];
      }>('medicine-strengths', {
        params: { limit: 500, status: 'ALL' },
      });
      const data = res.data;
      let list: MedicineStrength[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.items)) {
        list = data.items;
      } else if (data && Array.isArray((data as any).data)) {
        list = (data as any).data;
      }

      setAllVariants(list);
    } catch (err) {
      console.error('Failed to load variants list:', err);
      // Fallback: try with limit 100 in case backend has a limit cap
      try {
        const fallbackRes = await api.get<{ items?: MedicineStrength[] }>('medicine-strengths', {
          params: { limit: 100 },
        });
        if (fallbackRes.data && Array.isArray(fallbackRes.data.items)) {
          setAllVariants(fallbackRes.data.items);
        }
      } catch (fbErr) {
        console.error('Fallback load variants also failed:', fbErr);
      }
    } finally {
      setVariantsLoading(false);
    }
  }, []);

  // Load patients list
  const loadPatients = useCallback(async (query?: string) => {
    setPatientsLoading(true);
    try {
      const res = await api.get<PatientOption[]>('patients', {
        params: query ? { search: query } : { limit: 200 },
      });
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      setPatients(list);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  // Pre-load formulations and patients when component mounts
  useEffect(() => {
    void loadAllVariants();
    void loadPatients();
  }, [loadAllVariants, loadPatients]);

  // Open Give Tablet Drawer
  const handleOpenGiveTabletDrawer = (variantId?: string) => {
    void loadAllVariants();
    void loadPatients();
    setFormVariantId(variantId || '');
    setFormPatientId('');
    setFormCustomPatientName('');
    setFormQuantity(1);
    setFormReason('Given to Patient');
    setFormReferenceNumber(`DISP-${Date.now().toString(36).toUpperCase()}`);
    setFormNotes('');
    setIsReduceDrawerOpen(true);
  };

  // Currently selected variant in modal
  const selectedFormVariant = useMemo(() => {
    return allVariants.find((v) => v.id === formVariantId) || null;
  }, [formVariantId, allVariants]);

  // Patient Options for SearchableSelect
  const patientSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    return patients.map((p) => ({
      value: p.id,
      label: p.name,
      sublabel: p.phone ? `Phone: ${p.phone}` : undefined,
      badge: p.gender?.toUpperCase(),
      extraSearchTerms: [p.phone || '', p.name],
    }));
  }, [patients]);

  // Medicine Variant Options for SearchableSelect
  const variantSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    return allVariants.map((v) => {
      const medName = v.medicine_name || 'Medicine';
      const strengthPart = [v.strength, v.strength_unit].filter(Boolean).join(' ');
      const dosagePart = v.dosage_form ? `(${v.dosage_form})` : '';
      const strengthLabel = [strengthPart, dosagePart].filter(Boolean).join(' ');
      const label = strengthLabel ? `${medName} - ${strengthLabel}` : medName;
      const stockBadge =
        (v.available_quantity ?? 0) > 0 ? `${v.available_quantity} available` : 'Out of stock';

      return {
        value: v.id,
        label,
        sublabel: v.generic_name ? `Generic: ${v.generic_name}` : undefined,
        badge: stockBadge,
        badgeTone:
          (v.available_quantity ?? 0) > 0
            ? (v.available_quantity ?? 0) <= (v.reorder_level ?? 0)
              ? 'amber'
              : 'green'
            : 'red',
        extraSearchTerms: [medName, v.generic_name || '', v.strength || '', v.dosage_form || ''],
      };
    });
  }, [allVariants]);

  // Prescription Options for SearchableSelect
  const prescriptionSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    return allPrescriptions.map((rx) => {
      const rxNum = rx.prescription_number || `RX-${rx.id.slice(0, 8).toUpperCase()}`;
      const dateFormatted = rx.prescription_date
        ? dayjs(rx.prescription_date).format('DD MMM YYYY')
        : 'Recent Date';
      const medCount = rx.medicines?.length || 0;
      const docName = rx.doctor?.name ? `Dr. ${rx.doctor.name}` : 'Practicing Doctor';
      const patName = rx.patient_name || 'Patient';
      const diag = rx.diagnosis || rx.additional_notes || 'General Consultation';

      return {
        value: rx.id,
        label: `${rxNum} · ${patName}`,
        sublabel: `${diag} · ${docName} · ${dateFormatted} · ${medCount} meds`,
        badge: rxNum,
        badgeTone: 'green',
        extraSearchTerms: [
          rxNum,
          rx.prescription_number || '',
          rx.id,
          patName,
          rx.patient_phone || '',
          diag,
          docName,
          dateFormatted,
          ...(rx.medicines?.map((m) => m.medicine_name) || []),
        ],
      };
    });
  }, [allPrescriptions]);

  // Submit Give Tablet / Reduce Stock
  const handleConfirmReduceStock = async () => {
    if (!formVariantId) {
      message.error('Please select a medicine formulation to dispense.');
      return;
    }

    if (!selectedFormVariant) {
      message.error('Selected medicine formulation could not be found.');
      return;
    }

    if (formQuantity <= 0) {
      message.error('Quantity of tablets to give must be greater than zero.');
      return;
    }

    if (formQuantity > selectedFormVariant.available_quantity) {
      message.error(
        `Cannot give ${formQuantity} tablets. Only ${selectedFormVariant.available_quantity} tablets are available in inventory.`
      );
      return;
    }

    const patientName =
      formCustomPatientName.trim() ||
      patients.find((p) => p.id === formPatientId)?.name ||
      undefined;

    setSubmitting(true);
    try {
      const payload: DispensePayload = {
        medicine_strength_id: formVariantId,
        quantity: formQuantity,
        patient_id: formPatientId || undefined,
        patient_name: patientName,
        reference_number: formReferenceNumber.trim() || undefined,
        reason: formReason.trim() || 'Given to Patient',
        notes: formNotes.trim() || undefined,
      };

      const res = await api.post<{
        success: boolean;
        variant: MedicineStrength;
        historyRecord: StockHistoryItem;
      }>('inventory/dispense', payload);

      const updated = res.data?.variant;
      const historyItem = res.data?.historyRecord;

      message.success(
        `Successfully dispensed ${formQuantity} tablets of ${selectedFormVariant.medicine_name || 'medicine'}! Available stock reduced from ${historyItem?.quantity_before ?? selectedFormVariant.available_quantity} to ${updated?.available_quantity ?? selectedFormVariant.available_quantity - formQuantity}.`
      );

      setIsReduceDrawerOpen(false);
      void resource.refresh();

      // Offer to view receipt
      if (historyItem) {
        setSelectedReceipt({
          ...historyItem,
          medicine_name: selectedFormVariant.medicine_name,
          generic_name: selectedFormVariant.generic_name,
          strength: selectedFormVariant.strength,
          strength_unit: selectedFormVariant.strength_unit,
          dosage_form: selectedFormVariant.dosage_form,
        });
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to reduce medicine stock.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Load all prescriptions for searching by Prescription ID
  const loadAllPrescriptions = useCallback(async (searchQuery?: string) => {
    setRxLoading(true);
    try {
      const res = await api.get<{ data?: PrescriptionSummary[] } | PrescriptionSummary[]>('prescriptions', {
        params: { limit: 150, search: searchQuery || undefined },
      });
      const rawList = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      setAllPrescriptions(rawList);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setRxLoading(false);
    }
  }, []);

  // Open Prescription Dispense Modal
  const handleOpenPrescriptionModal = () => {
    void loadAllVariants();
    void loadAllPrescriptions();
    setSelectedRxId('');
    setSelectedRx(null);
    setRxItemsToDispense([]);
    setIsPrescriptionModalOpen(true);
  };

  // When prescription is selected, map items to inventory variants
  const handleSelectPrescription = (rxId: string) => {
    setSelectedRxId(rxId);
    const rx = allPrescriptions.find((p) => p.id === rxId);
    setSelectedRx(rx || null);
    if (!rx || !rx.medicines?.length) {
      setRxItemsToDispense([]);
      return;
    }

    const items = rx.medicines.map((m) => {
      const matched =
        allVariants.find(
          (v) =>
            v.medicine_id === m.medicine_id ||
            v.medicine_name?.toLowerCase().trim() === m.medicine_name.toLowerCase().trim()
        ) || null;

      const qty = m.prescribed_quantity && m.prescribed_quantity > 0 ? m.prescribed_quantity : 10;
      const unitPrice =
        matched?.final_price ||
        matched?.mrp ||
        m.final_price ||
        m.mrp ||
        25;

      return {
        medicineName: m.medicine_name,
        strength: m.strength || matched?.strength || undefined,
        prescribedQuantity: qty,
        matchedVariantId: matched?.id || null,
        matchedVariant: matched,
        unitPrice: Number(unitPrice) || 25,
        dispenseQuantity: qty,
        included: Boolean(matched && matched.available_quantity > 0),
        notes: `${m.dosage || '1 Tablet'} · ${m.frequency || '1-0-1'} · ${m.duration || '5 Days'}`,
      };
    });

    setRxItemsToDispense(items);
  };

  // Step 1: Generate Bill (Review first, dispense separately afterwards)
  const handleGenerateBill = () => {
    const includedItems = rxItemsToDispense.filter((i) => i.included);
    if (includedItems.length === 0) {
      message.error('Please select at least one medicine item to generate the bill.');
      return;
    }

    for (const item of includedItems) {
      if (!item.matchedVariantId || !item.matchedVariant) {
        message.error(`Please match "${item.medicineName}" to a valid inventory variant before generating the bill.`);
        return;
      }
      if (item.dispenseQuantity <= 0) {
        message.error(`Quantity for "${item.medicineName}" must be greater than zero.`);
        return;
      }
      if (item.dispenseQuantity > item.matchedVariant.available_quantity) {
        message.error(
          `Insufficient stock for "${item.medicineName}". Available: ${item.matchedVariant.available_quantity}, requested: ${item.dispenseQuantity}.`
        );
        return;
      }
    }

    const patientName = selectedRx?.patient_name || 'Patient';
    const rxNumber = selectedRx?.prescription_number || (selectedRx ? `RX-${selectedRx.id.slice(0, 8).toUpperCase()}` : 'RX-PRES');

    const billItems: DispenseBillItem[] = includedItems.map((i) => ({
      medicineName: i.medicineName,
      strength: i.strength,
      quantity: i.dispenseQuantity,
      unitPrice: i.unitPrice,
      totalPrice: Math.round(i.dispenseQuantity * i.unitPrice * 100) / 100,
      notes: i.notes,
      matchedVariantId: i.matchedVariantId,
      matchedVariant: i.matchedVariant,
    }));

    const subtotal = billItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const bill: DispenseBill = {
      billNumber: `BILL-${rxNumber}-${String(Date.now()).slice(-4)}`,
      billDate: dayjs().format('DD MMM YYYY, hh:mm A'),
      prescriptionNumber: rxNumber,
      prescriptionId: selectedRxId,
      patientName,
      patientId: selectedRx?.patient_id,
      patientPhone: selectedRx?.patient_phone,
      doctorName: formatDoctorDisplay(selectedRx?.doctor?.name),
      items: billItems,
      subtotal,
      tax: 0,
      grandTotal: subtotal,
      referenceNumber: `RX-DISP-${Date.now().toString(36).toUpperCase()}`,
      isDispensed: false,
    };

    setGeneratedBill(bill);
    setIsPrescriptionModalOpen(false);
    message.success('Bill generated! Please review the bill and confirm dispensing to deduct stock.');
  };

  // Step 2: Confirm Dispensing & Deduct Stock from Inventory (Separate action from bill generation)
  const handleConfirmRxDispense = async () => {
    if (!generatedBill) return;

    setRxSubmitting(true);
    try {
      const payload = {
        patient_id: generatedBill.patientId || undefined,
        patient_name: generatedBill.patientName,
        prescription_id: generatedBill.prescriptionId || undefined,
        reference_number: generatedBill.referenceNumber || `RX-DISP-${Date.now().toString(36).toUpperCase()}`,
        reason: `Prescription Dispense (${generatedBill.prescriptionNumber})`,
        items: generatedBill.items.map((i) => ({
          medicine_strength_id: i.matchedVariantId!,
          quantity: i.quantity,
          notes: i.notes,
        })),
      };

      const res = await api.post<{
        success: boolean;
        dispensedCount: number;
        referenceNumber: string;
      }>('inventory/batch-dispense', payload);

      setGeneratedBill((prev) =>
        prev
          ? {
              ...prev,
              isDispensed: true,
              dispensedAt: dayjs().format('DD MMM YYYY, hh:mm A'),
              referenceNumber: res.data?.referenceNumber || payload.reference_number,
            }
          : null
      );

      void resource.refresh();
      message.success(
        `Prescription dispensed successfully! Stock has been deducted from inventory.`
      );
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to process prescription dispensing.'));
    } finally {
      setRxSubmitting(false);
    }
  };

  const handleBackToPrescription = () => {
    setGeneratedBill(null);
    setIsPrescriptionModalOpen(true);
  };

  // Print voucher
  const handlePrintReceipt = () => {
    window.print();
  };

  // Columns for DataView
  const columns: Column<StockHistoryItem>[] = [
    {
      id: 'medicine',
      header: 'Medicine & Formulation',
      sort: (m) => (m.medicine_name ?? '').toLowerCase(),
      cell: (m) => (
        <PrimaryCell
          name={m.medicine_name || 'Prescribed Medicine'}
          sub={
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">
                {m.strength} {m.strength_unit}
              </span>
              <span>·</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10.5px] font-semibold text-slate-600">
                {m.dosage_form || 'Tablet'}
              </span>
              {m.generic_name && (
                <>
                  <span>·</span>
                  <span className="italic text-slate-400">{m.generic_name}</span>
                </>
              )}
            </span>
          }
          onOpen={() => setSelectedReceipt(m)}
        />
      ),
    },
    {
      id: 'recipient',
      header: 'Recipient / Patient',
      sort: (m) => getPatientName(m).toLowerCase(),
      cell: (m) => (
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <User size={11} />
          </span>
          <span className="font-medium text-slate-800 text-xs truncate max-w-[150px]">
            {getPatientName(m)}
          </span>
        </div>
      ),
    },
    {
      id: 'quantity',
      header: 'Tablets Given / Reduced',
      sort: (m) => m.quantity_change,
      cell: (m) => {
        const isReduction = m.quantity_change < 0;
        return (
          <Badge tone={isReduction ? 'red' : 'green'}>
            {isReduction ? `${m.quantity_change} Units` : `+${m.quantity_change} Units`}
          </Badge>
        );
      },
    },
    {
      id: 'stockShift',
      header: 'Stock Shift (Before -> After)',
      sort: (m) => m.quantity_after,
      cell: (m) => {
        const isReduction = m.quantity_change < 0;
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className="text-slate-500 font-medium">{m.quantity_before}</span>
            <ArrowRight size={11} className="text-slate-400" />
            <span
              className={
                isReduction ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'
              }
            >
              {m.quantity_after}
            </span>
          </div>
        );
      },
    },
    {
      id: 'reason',
      header: 'Reference & Reason',
      sort: (m) => (m.reason ?? '').toLowerCase(),
      cell: (m) => (
        <div className="max-w-[220px] text-xs">
          {m.reference_number && (
            <div className="font-mono text-[11px] font-semibold text-blue-600">
              #{m.reference_number}
            </div>
          )}
          <div className="text-slate-700 truncate" title={m.reason || ''}>
            {m.reason || 'Dispensed to Patient'}
          </div>
          {m.notes && !m.notes.startsWith('Patient:') && (
            <div className="text-[11px] text-slate-400 truncate" title={m.notes}>
              {m.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'performer',
      header: 'Dispensed By',
      sort: (m) => (m.performer_name ?? '').toLowerCase(),
      cell: (m) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800">{m.performer_name || 'Staff User'}</div>
          {m.performer_email && (
            <div className="text-[10.5px] text-slate-400">{m.performer_email}</div>
          )}
        </div>
      ),
    },
    {
      id: 'date',
      header: 'Date & Time',
      sort: (m) => new Date(m.created_at).getTime(),
      cell: (m) => (
        <ActivityCell
          label={dayjs(m.created_at).format('DD MMM, hh:mm A')}
          when={timeAgo(m.created_at)}
        />
      ),
    },
  ];

  return (
    <>
      <DataView<StockHistoryItem>
        moduleSlug="INVENTORY"
        title="Reduce Medicine Management"
        subtitle="Dispense tablets to patients, issue in-clinic treatments, and automatically track inventory stock reductions."
        icon={PackageMinus}
        noun="dispense record"
        nounPlural="dispense records"
        resource={resource}
        searchPlaceholder="Search medicine, patient, reference #, or reason…"
        searchFields={(m) => [
          m.medicine_name,
          m.generic_name,
          m.reference_number,
          m.reason,
          m.notes,
          m.performer_name,
          m.strength,
          m.dosage_form,
        ]}
        facets={FACETS}
        tabs={TABS}
        tabFilter={(item, tabId) => {
          if (tabId === 'dispense') return item.transaction_type === 'DISPENSE';
          if (tabId === 'stock_out') return item.transaction_type === 'STOCK_OUT';
          if (tabId === 'damaged_expired')
            return item.transaction_type === 'DAMAGED' || item.transaction_type === 'EXPIRED';
          return true;
        }}
        dateOf={(m) => m.created_at}
        columns={columns}
        minTableWidth={880}
        createLabel="Reduce Medicine / Give Tablet"
        onCreate={() => handleOpenGiveTabletDrawer()}
        canCreate={isInvUpdatable}
        canUpdate={isInvUpdatable}
        canDelete={false}
        onRowClick={(item) => setSelectedReceipt(item)}
        activeId={selectedReceipt?.id ?? null}
        renderMobileCard={(m, { isSel, toggleRow, showCheckCol }) => {
          const isReduction = m.quantity_change < 0;
          const patient = getPatientName(m);

          return (
            <div
              key={m.id}
              onClick={() => setSelectedReceipt(m)}
              className={cx(
                'group relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 cursor-pointer',
                'bg-white hover:border-slate-300 hover:shadow-xs',
                isSel ? 'border-purple-300 bg-purple-50/20' : 'border-slate-200/80',
              )}
            >
              {/* Header: Medicine Name, Formulation Chip, Checkbox */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {showCheckCol && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${m.medicine_name || 'record'}`}
                      checked={isSel}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleRow();
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-slate-900 group-hover:text-blue-600 leading-snug tracking-tight">
                        {m.medicine_name || 'Prescribed Medicine'}
                      </span>
                      {m.dosage_form && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {m.dosage_form}
                        </span>
                      )}
                    </div>
                    {(m.strength || m.generic_name) && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {m.strength && (
                          <span className="font-semibold text-slate-700 mr-1.5">
                            {m.strength} {m.strength_unit}
                          </span>
                        )}
                        {m.generic_name && (
                          <span className="italic text-slate-400">
                            Generic: {m.generic_name}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <Badge tone={isReduction ? 'red' : 'green'}>
                  {isReduction ? `${m.quantity_change} Units` : `+${m.quantity_change} Units`}
                </Badge>
              </div>

              {/* Recipient & Stock Shift */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[10.5px] text-slate-400 block uppercase font-medium">Recipient</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-medium text-slate-800 truncate" title={patient}>
                    <User size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{patient}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-400 block uppercase font-medium">Stock Shift</span>
                  <div className="inline-flex items-center gap-1.5 mt-0.5 font-medium">
                    <span className="text-slate-500">{m.quantity_before}</span>
                    <ArrowRight size={11} className="text-slate-400" />
                    <span className={isReduction ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
                      {m.quantity_after}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason, Reference, Notes */}
              {(m.reason || m.reference_number || (m.notes && !m.notes.startsWith('Patient:'))) && (
                <div className="text-xs space-y-0.5">
                  {m.reference_number && (
                    <span className="font-mono text-[11px] font-semibold text-blue-600 block">
                      #{m.reference_number}
                    </span>
                  )}
                  {m.reason && (
                    <div className="text-slate-700 truncate" title={m.reason}>
                      {m.reason}
                    </div>
                  )}
                  {m.notes && !m.notes.startsWith('Patient:') && (
                    <div className="text-[11px] text-slate-400 truncate" title={m.notes}>
                      {m.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Card Footer: Dispensed by, Date & Touch Action */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="min-w-0">
                  <div className="font-medium text-slate-700 truncate text-[11.5px]">
                    {m.performer_name || 'Staff User'}
                  </div>
                  <div className="text-[10.5px] text-slate-400">
                    {dayjs(m.created_at).format('DD MMM, hh:mm A')}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(m)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer min-h-[32px]"
                    title="View Printable Dispense Voucher"
                    aria-label={`View slip for ${m.medicine_name || 'dispense record'}`}
                  >
                    <Printer size={12} className="text-slate-500" />
                    <span>Slip</span>
                  </button>
                </div>
              </div>
            </div>
          );
        }}
        extraActions={
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 sm:h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              onClick={() => navigate('/inventory')}
              title="View full inventory stock balances"
            >
              <Boxes size={13} className="text-slate-500" />
              <span>Medicine Inventory</span>
            </button>

            {isInvUpdatable && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 sm:h-7.5 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                onClick={handleOpenPrescriptionModal}
                title="Dispense from patient prescription on file"
              >
                <FileText size={13} className="text-emerald-600" />
                <span>Dispense Prescription</span>
              </button>
            )}
          </div>
        }
        rowActions={(item) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedReceipt(item);
            }}
            title="View Printable Dispense Voucher"
          >
            <Printer size={11} className="text-slate-500" />
            <span>Slip</span>
          </button>
        )}
      />

      {/* ── DOCTOR-STYLE CREATE DRAWER: REDUCE MEDICINE / GIVE TABLET ── */}
      <Modal
        open={isReduceDrawerOpen}
        onClose={() => setIsReduceDrawerOpen(false)}
        size="lg"
        variant="drawer"
        className="doctor-create-drawer-modal"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
              }}
            >
              <PackageMinus size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 16.5,
                  fontWeight: 700,
                  color: 'var(--ui-text, #0f172a)',
                  letterSpacing: '-0.01em',
                }}
              >
                Reduce Medicine / Give Tablet
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                Select medicine formulation, specify tablet count, and deduct directly from live inventory stock.
              </div>
            </div>
          </div>
        }
        description=""
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleConfirmReduceStock();
          }}
          className="ui-modal-form"
          noValidate
        >
          <style>{`
            .doctor-create-drawer-modal {
              width: min(720px, 100vw) !important;
              max-width: 720px !important;
              background: #ffffff;
              box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
            }
            .doctor-create-drawer-modal .ui-modal-head {
              padding: 18px 26px;
              background: #ffffff;
              border-bottom: 1px solid #f1f5f9;
            }
            .doctor-create-drawer-modal .ui-modal-body {
              padding: 20px 24px;
              background: #f8fafc;
              display: flex;
              flex-direction: column;
              gap: 14px;
            }
            .doctor-section-card {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 18px 20px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
              display: flex;
              flex-direction: column;
              gap: 14px;
              transition: border-color 0.15s ease;
            }
            .doctor-section-card:hover {
              border-color: #cbd5e1;
            }
            .doctor-section-header {
              display: flex;
              align-items: center;
              gap: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid #f1f5f9;
            }
            .doctor-section-badge {
              width: 26px;
              height: 26px;
              border-radius: 7px;
              background: #eff6ff;
              color: #2563eb;
              border: 1px solid #dbeafe;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .doctor-section-badge svg {
              display: block;
              margin: auto;
            }
            .doctor-section-tag {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.06em;
              color: #475569;
              text-transform: uppercase;
            }
            .doctor-create-drawer-modal .ui-input,
            .doctor-create-drawer-modal .ui-select,
            .doctor-create-drawer-modal .ui-textarea {
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              font-size: 13px;
              transition: all 0.15s ease;
            }
            .doctor-create-drawer-modal .ui-input,
            .doctor-create-drawer-modal .ui-select {
              height: 38px;
            }
            .doctor-create-drawer-modal .ui-input:focus,
            .doctor-create-drawer-modal .ui-select:focus,
            .doctor-create-drawer-modal .ui-textarea:focus {
              border-color: #2563eb !important;
              box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
              outline: none;
            }
            .doctor-submit-btn {
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
              box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28) !important;
              border: none !important;
              color: #ffffff !important;
              height: 38px;
              padding: 0 18px;
              font-size: 13px;
              font-weight: 600;
              border-radius: 8px;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              cursor: pointer;
            }
            .doctor-submit-btn:hover:not(:disabled) {
              background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important;
              box-shadow: 0 4px 12px rgba(37, 99, 235, 0.36) !important;
            }
            @media (max-width: 640px) {
              .doctor-create-drawer-modal {
                width: 100vw !important;
                max-width: 100vw !important;
                border-radius: 0 !important;
              }
              .doctor-create-drawer-modal .ui-modal-head {
                padding: 14px 16px !important;
              }
              .doctor-create-drawer-modal .ui-modal-body {
                padding: 14px 12px !important;
                gap: 12px !important;
              }
              .doctor-section-card {
                padding: 14px 12px !important;
                border-radius: 10px !important;
              }
            }
            @media (max-width: 480px) {
              .doctor-create-drawer-modal .ui-modal-foot {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 12px !important;
                padding: 12px 14px !important;
              }
              .doctor-create-drawer-modal .ui-modal-foot > div:last-child {
                display: flex !important;
                flex-direction: column-reverse !important;
                width: 100% !important;
                gap: 8px !important;
              }
              .doctor-create-drawer-modal .ui-modal-foot button {
                width: 100% !important;
                justify-content: center !important;
                height: 40px !important;
              }
            }
          `}</style>

          <div className="ui-modal-body">
            {/* Section 1: Medicine Selection & Available Stock */}
            <div className="doctor-section-card">
              <div className="doctor-section-header">
                <div className="doctor-section-badge">
                  <Pill size={13} />
                </div>
                <div className="doctor-section-tag">1. Medicine Formulation & Available Stock</div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 5,
                  }}
                >
                  <span>Medicine Formulation</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableSelect
                  placeholder="Select medicine formulation (e.g. Paracetamol 500mg)..."
                  searchPlaceholder="Search medicine by name, generic, or dosage form..."
                  value={formVariantId}
                  options={variantSelectOptions}
                  onChange={(val) => setFormVariantId(val)}
                  loading={variantsLoading}
                  emptyText={variantsLoading ? 'Loading medicine formulations...' : 'No medicine formulations found'}
                  width="100%"
                  menuWidth="trigger"
                  searchable={true}
                />
              </div>

              {/* Live Stock Info Banner if variant selected */}
              {selectedFormVariant && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: selectedFormVariant.available_quantity > 0 ? '1px solid #a7f3d0' : '1px solid #fecaca',
                    background: selectedFormVariant.available_quantity > 0 ? 'rgba(236, 253, 245, 0.8)' : 'rgba(254, 242, 242, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                      Current Inventory Stock
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {selectedFormVariant.strip_count} strips · {selectedFormVariant.tablets_per_strip || 10} tabs/strip
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 750,
                        color: selectedFormVariant.available_quantity > 0 ? '#047857' : '#b91c1c',
                      }}
                    >
                      {selectedFormVariant.available_quantity} Tablets
                    </span>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>Available on hand</div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Patient / Recipient */}
            <div className="doctor-section-card">
              <div className="doctor-section-header">
                <div className="doctor-section-badge">
                  <User size={13} />
                </div>
                <div className="doctor-section-tag">2. Recipient & Patient Information</div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Registered Patient
                </label>
                <SearchableSelect
                  placeholder="Select registered patient (or enter walk-in below)..."
                  searchPlaceholder="Search registered patient by name or phone..."
                  value={formPatientId}
                  options={patientSelectOptions}
                  onChange={(val) => {
                    setFormPatientId(val);
                    const p = patients.find((pt) => pt.id === val);
                    if (p) setFormCustomPatientName(p.name);
                  }}
                  loading={patientsLoading}
                  emptyText={patientsLoading ? 'Loading patients...' : 'No registered patients found'}
                  width="100%"
                  menuWidth="trigger"
                  searchable={true}
                />
              </div>

              {!formPatientId && (
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Walk-in / OP Recipient Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter walk-in or clinic patient recipient name..."
                    value={formCustomPatientName}
                    onChange={(e) => setFormCustomPatientName(e.target.value)}
                    className="ui-input w-full"
                  />
                </div>
              )}
            </div>

            {/* Section 3: Quantity of Tablets to Give */}
            <div className="doctor-section-card">
              <div className="doctor-section-header">
                <div className="doctor-section-badge">
                  <PackageMinus size={13} />
                </div>
                <div className="doctor-section-tag">3. Tablet Quantity & Real-Time Reduction</div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 5,
                  }}
                >
                  <span>Number of Tablets Given</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    min="1"
                    max={selectedFormVariant?.available_quantity || 100000}
                    value={formQuantity}
                    onChange={(e) =>
                      setFormQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))
                    }
                    className="ui-input"
                    style={{
                      width: 90,
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  />

                  {/* Quick Add Presets */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[1, 2, 5, 10, 15].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setFormQuantity(qty)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: formQuantity === qty ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                          background: formQuantity === qty ? '#eff6ff' : '#ffffff',
                          color: formQuantity === qty ? '#1d4ed8' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        +{qty}
                      </button>
                    ))}
                    {selectedFormVariant?.tablets_per_strip && (
                      <button
                        type="button"
                        onClick={() => setFormQuantity(selectedFormVariant.tablets_per_strip!)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#334155',
                        }}
                      >
                        1 Strip ({selectedFormVariant.tablets_per_strip} tabs)
                      </button>
                    )}
                  </div>
                </div>

                {/* Real-time Stock Calculation Feedback */}
                {selectedFormVariant && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 12,
                      color: '#475569',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>
                        Current: <strong>{selectedFormVariant.available_quantity}</strong>
                      </span>
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>
                        -{formQuantity}
                      </span>
                      <ArrowRight size={12} style={{ color: '#94a3b8' }} />
                    </div>
                    <div
                      style={{
                        fontWeight: 750,
                        color: selectedFormVariant.available_quantity - formQuantity >= 0 ? '#047857' : '#dc2626',
                      }}
                    >
                      Remaining After: {selectedFormVariant.available_quantity - formQuantity} Tablets
                    </div>
                  </div>
                )}

                {selectedFormVariant && formQuantity > selectedFormVariant.available_quantity && (
                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11.5,
                      color: '#dc2626',
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>
                      Cannot give more tablets than available inventory stock ({selectedFormVariant.available_quantity}).
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Clinical Purpose, Reference & Notes */}
            <div className="doctor-section-card">
              <div className="doctor-section-header">
                <div className="doctor-section-badge">
                  <FileText size={13} />
                </div>
                <div className="doctor-section-tag">4. Dispense Purpose & Audit Details</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Dispense Reason
                  </label>
                  <SearchableSelect
                    placeholder="Select dispense reason..."
                    searchPlaceholder="Search reason..."
                    value={formReason}
                    options={DISPENSE_REASON_OPTIONS}
                    onChange={(val) => setFormReason(val)}
                    searchable={false}
                    width="100%"
                    menuWidth={360}
                    renderSelected={(opt) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {opt?.label}
                        </span>
                        {opt?.badge && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 9999,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              flexShrink: 0,
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    )}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DISP-XXXX, Bill #"
                    value={formReferenceNumber}
                    onChange={(e) => setFormReferenceNumber(e.target.value)}
                    className="ui-input w-full"
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Dosage Instructions / Clinical Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 tablet after food twice daily for 5 days"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="ui-input w-full"
                />
              </div>
            </div>
          </div>

          <div
            className="ui-modal-foot"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsReduceDrawerOpen(false)}
                className="ui-btn ui-btn-neutral"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  !formVariantId ||
                  formQuantity <= 0 ||
                  (selectedFormVariant != null &&
                    formQuantity > selectedFormVariant.available_quantity)
                }
                className="doctor-submit-btn"
              >
                {submitting ? (
                  <>
                    <Spin size="small" />
                    <span>Reducing Stock…</span>
                  </>
                ) : (
                  <>
                    <PackageMinus size={14} />
                    <span>Confirm & Deduct Stock</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── DRAWER 2: DISPENSE FROM PRESCRIPTION ── */}
      <Drawer
        open={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        width="min(880px, 100vw)"
        destroyOnHidden
        styles={{
          header: {
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          },
          body: {
            padding: '16px 16px',
            background: '#f8fafc',
          },
          footer: {
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
          },
        }}
        title={
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Dispense from Prescription
              </div>
              <div className="text-[11.5px] text-slate-500">
                Search prescription by ID (e.g. AN-CH-001), auto-match medicines, and generate an itemized bill.
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {selectedRx ? (
                <span>
                  <strong>{rxItemsToDispense.filter((i) => i.included).length}</strong> of{' '}
                  <strong>{rxItemsToDispense.length}</strong> items selected for billing
                </span>
              ) : (
                'Search and select a prescription to load medicines'
              )}
            </div>

            <div className="flex items-center gap-2 justify-end flex-wrap">
              <button
                type="button"
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer min-h-[36px]"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={rxItemsToDispense.filter((i) => i.included).length === 0}
                onClick={handleGenerateBill}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs cursor-pointer disabled:opacity-50 min-h-[36px]"
              >
                <ClipboardCheck size={14} />
                <span>Generate Bill</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Search using Prescription ID */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Search using Prescription ID
            </label>
            <SearchableSelect
              placeholder="Search prescription by ID (e.g. AN-CH-001) or patient name..."
              searchPlaceholder="Type prescription ID (e.g. AN-CH-001)..."
              value={selectedRxId}
              options={prescriptionSelectOptions}
              onChange={(val) => handleSelectPrescription(val)}
              loading={rxLoading}
              emptyText={rxLoading ? 'Loading prescriptions...' : 'No active prescriptions found'}
              width="100%"
              menuWidth="trigger"
              searchable={true}
              clearable={true}
              onClear={() => handleSelectPrescription('')}
            />
          </div>

          {/* Selected Prescription & Patient Summary Badge */}
          {selectedRx && (
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-50/90 via-blue-50/50 to-slate-50 border border-emerald-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                  Rx
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {selectedRx.patient_name || 'Patient'}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-md border border-emerald-300">
                      {selectedRx.prescription_number || `RX-${selectedRx.id.slice(0, 8).toUpperCase()}`}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    {selectedRx.patient_phone && <span>📞 {selectedRx.patient_phone}</span>}
                    <span>•</span>
                    <span>👨‍⚕️ {formatDoctorDisplay(selectedRx.doctor?.name)}</span>
                    <span>•</span>
                    <span>📅 {selectedRx.prescription_date ? dayjs(selectedRx.prescription_date).format('DD MMM YYYY') : ''}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200">
                  {selectedRx.medicines?.length || 0} Prescribed Items
                </span>
              </div>
            </div>
          )}

          {/* Prescribed Medicines Matching & Pricing Table */}
          {selectedRxId && rxItemsToDispense.length > 0 && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Prescribed Tablets &amp; Inventory Match
                </label>
                <span className="text-xs text-slate-500">
                  {rxItemsToDispense.filter((i) => i.included).length} of {rxItemsToDispense.length} items selected for dispensing
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="p-2.5 text-center w-12">Give</th>
                      <th className="p-2.5">Prescribed Medicine</th>
                      <th className="p-2.5">Inventory Match</th>
                      <th className="p-2.5 text-center">Available</th>
                      <th className="p-2.5 text-center w-24">Rate (₹)</th>
                      <th className="p-2.5 text-center w-24">Qty Given</th>
                      <th className="p-2.5 text-right w-24">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rxItemsToDispense.map((item, index) => {
                      const hasMatch = Boolean(item.matchedVariant);
                      const hasStock = Boolean(
                        item.matchedVariant &&
                        item.matchedVariant.available_quantity >= item.dispenseQuantity
                      );
                      const lineTotal = Math.round(item.dispenseQuantity * item.unitPrice * 100) / 100;

                      return (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={item.included}
                              disabled={
                                !hasMatch ||
                                !item.matchedVariant ||
                                item.matchedVariant.available_quantity <= 0
                              }
                              onChange={(e) => {
                                const copy = [...rxItemsToDispense];
                                if (copy[index]) {
                                  copy[index].included = e.target.checked;
                                  setRxItemsToDispense(copy);
                                }
                              }}
                            />
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-900">
                              {item.medicineName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.strength || ''} · {item.notes}
                            </div>
                          </td>
                          <td className="p-2.5">
                            {hasMatch ? (
                              <div className="text-slate-800">
                                {item.matchedVariant?.medicine_name} (
                                {item.matchedVariant?.strength}{' '}
                                {item.matchedVariant?.strength_unit})
                              </div>
                            ) : (
                              <span className="text-red-500 text-[11px]">
                                No matching inventory item
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {hasMatch ? (
                              <span
                                className={`font-bold ${hasStock ? 'text-emerald-700' : 'text-red-600'
                                  }`}
                              >
                                {item.matchedVariant?.available_quantity}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="font-medium text-slate-700">
                              ₹{item.unitPrice.toFixed(2)}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="1"
                              max={item.matchedVariant?.available_quantity || 1000}
                              value={item.dispenseQuantity}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value || '1', 10));
                                const copy = [...rxItemsToDispense];
                                if (copy[index]) {
                                  copy[index].dispenseQuantity = val;
                                  setRxItemsToDispense(copy);
                                }
                              }}
                              className="w-16 px-1.5 py-1 rounded border border-slate-300 text-center font-bold text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="font-bold text-slate-900">
                              {item.included ? `₹${lineTotal.toFixed(2)}` : '—'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Subtotal & Grand Total Summary Bar */}
              <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="text-slate-600">
                  Total Selected: <strong className="text-slate-900">{rxItemsToDispense.filter((i) => i.included).length} items</strong> (
                  {rxItemsToDispense.filter((i) => i.included).reduce((sum, i) => sum + i.dispenseQuantity, 0)} units)
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Grand Total: <span className="text-emerald-700 font-extrabold text-base">₹{rxItemsToDispense.filter((i) => i.included).reduce((sum, i) => sum + i.dispenseQuantity * i.unitPrice, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* ── DRAWER 3: GENERATED PHARMACY BILL / INVOICE ── */}
      <Drawer
        open={Boolean(generatedBill)}
        onClose={() => setGeneratedBill(null)}
        width="min(860px, 100vw)"
        destroyOnHidden
        styles={{
          header: {
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          },
          body: {
            padding: '16px 16px',
            background: '#f8fafc',
          },
          footer: {
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
          },
        }}
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pr-2 sm:pr-4 w-full">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 shadow-2xs ${
                  generatedBill?.isDispensed
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                ₹
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">
                    {generatedBill?.isDispensed
                      ? 'Pharmacy Cash Memo & Dispensation Receipt'
                      : 'Pharmacy Cash Bill (Preview)'}
                  </span>
                  {generatedBill && (
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        generatedBill.isDispensed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {generatedBill.isDispensed ? '✓ Dispensed & Stock Deducted' : '⏳ Step 1 of 2: Bill Generated'}
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-slate-500 font-mono mt-0.5">
                  Invoice #{generatedBill?.billNumber}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs self-start sm:self-auto min-h-[32px]"
            >
              <Printer size={13} />
              <span>{generatedBill?.isDispensed ? 'Print Receipt' : 'Print Draft'}</span>
            </button>
          </div>
        }
        footer={
          generatedBill && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {generatedBill.isDispensed ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>
                      Stock deducted on <strong>{generatedBill.dispensedAt}</strong> (Ref: {generatedBill.referenceNumber})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    <span>Review items below. Stock has <strong>not</strong> been deducted yet.</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {!generatedBill.isDispensed ? (
                  <>
                    <button
                      type="button"
                      onClick={handleBackToPrescription}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs min-h-[36px]"
                    >
                      <ArrowLeft size={13} />
                      <span>Back to Prescription</span>
                    </button>
                    <button
                      type="button"
                      disabled={rxSubmitting}
                      onClick={handleConfirmRxDispense}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs cursor-pointer disabled:opacity-50 min-h-[36px]"
                    >
                      <ClipboardCheck size={14} />
                      <span>{rxSubmitting ? 'Deducting Stock…' : 'Confirm Dispense & Deduct Stock'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs min-h-[36px]"
                    >
                      <Printer size={13} />
                      <span>Print Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratedBill(null)}
                      className="px-4 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer min-h-[36px]"
                    >
                      Done / Close
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        }
      >
        {generatedBill && (
          <div className="space-y-4">
            {/* Status Information Banner */}
            {!generatedBill.isDispensed ? (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-amber-900">Step 1 of 2 Complete (Draft Bill Preview)</div>
                    <div className="text-amber-800 text-[11.5px] mt-0.5">
                      Stock has <strong>not</strong> been deducted from inventory yet. Review the details below and click{' '}
                      <strong>Confirm Dispense &amp; Deduct Stock</strong> in the bottom bar to deduct stock from pharmacy inventory.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-900">Step 2 of 2 Complete · Dispensed &amp; Stock Deducted</div>
                    <div className="text-emerald-800 text-[11.5px] mt-0.5">
                      Medication stock was deducted on <strong>{generatedBill.dispensedAt}</strong>. Official reference ID:{' '}
                      <strong className="font-mono">{generatedBill.referenceNumber}</strong>.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Printable Official Invoice Card */}
            <div
              id="pharmacy-bill-print-area"
              className="p-4 sm:p-6 border border-slate-200 rounded-2xl bg-white shadow-2xs space-y-5"
            >
              {/* Hospital Clinical Header */}
              <div className="text-center border-b border-dashed border-slate-300 pb-4">
                <div className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-emerald-200">
                  <Pill size={12} />
                  <span>Pharmacy Cash Memo · Medication Dispensation</span>
                </div>
                <div className="text-xl font-bold text-slate-900 tracking-tight">
                  Annaamalai Cancer Center
                </div>
                <div className="text-xs font-semibold text-slate-600 mt-0.5">
                  Department of Pharmacy &amp; Clinical Medication Dispensation
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  No. 18, Kottivakkam Kuppam Rd, Thiruvanmiyur, Chennai, Tamil Nadu - 600 041 · Ph: +91 84380 56883 · GSTIN: 33AAAAA0000A1Z5
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
                <div>
                  <span className="text-[11px] text-slate-500 block uppercase font-medium">Bill Number</span>
                  <strong className="text-slate-900 font-mono text-[12.5px]">{generatedBill.billNumber}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block uppercase font-medium">Date &amp; Time</span>
                  <strong className="text-slate-900">{generatedBill.billDate}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block uppercase font-medium">Prescription ID</span>
                  <span className="inline-block font-mono font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded text-[11px] border border-emerald-300 mt-0.5">
                    {generatedBill.prescriptionNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block uppercase font-medium">Prescribing Doctor</span>
                  <strong className="text-slate-900">{formatDoctorDisplay(generatedBill.doctorName)}</strong>
                </div>
                <div className="col-span-1 sm:col-span-2 md:col-span-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 border-t border-slate-200 pt-2.5 mt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-500 uppercase font-medium">Patient:</span>
                    <strong className="text-slate-900 text-[13px]">{generatedBill.patientName}</strong>
                    {generatedBill.patientId && (
                      <span className="text-[10.5px] text-slate-400 font-mono">({generatedBill.patientId.slice(0, 8)})</span>
                    )}
                  </div>
                  {generatedBill.patientPhone && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 uppercase font-medium">Phone:</span>
                      <strong className="text-slate-900 font-mono">{generatedBill.patientPhone}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Item Description &amp; Formulation</th>
                      <th className="py-2.5 px-3 text-center w-24">Qty Given</th>
                      <th className="py-2.5 px-3 text-right w-24">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right w-28">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {generatedBill.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 text-[12.5px]">{item.medicineName}</div>
                          {item.strength && (
                            <div className="text-[11px] text-slate-500 font-medium">{item.strength}</div>
                          )}
                          {item.notes && (
                            <div className="text-[10.5px] text-slate-400 italic mt-0.5">{item.notes}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-xs">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 text-[12.5px]">
                          ₹{item.totalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="border-t-2 border-slate-200 pt-3">
                <div className="flex justify-end">
                  <div className="w-full sm:w-72 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-900">₹{generatedBill.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST / Taxes:</span>
                      <span className="font-semibold text-slate-900">
                        ₹{generatedBill.tax.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">(Exempted)</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t-2 border-slate-200 pt-2 bg-emerald-50/50 p-2 rounded-lg">
                      <span>Net Amount Payable:</span>
                      <span className="text-emerald-700 font-extrabold text-lg">₹{generatedBill.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures & Certification */}
              <div className="pt-6 border-t border-dashed border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 text-[11px] text-slate-500">
                <div>
                  <div className="font-semibold text-slate-800">Thank you! Get well soon.</div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">Computer-generated tax receipt. Valid without signature.</div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="w-40 border-b border-slate-300 pb-1 mb-1 font-semibold text-slate-700 text-center">
                    Authorized Pharmacist
                  </div>
                  <div className="text-[10px] text-slate-400 text-center">Annaamalai Pharmacy Seal</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── MODAL 3: PRINTABLE DISPENSE RECEIPT / SLIP ── */}
      {selectedReceipt && (
        <AntModal
          open={Boolean(selectedReceipt)}
          onCancel={() => setSelectedReceipt(null)}
          footer={null}
          width="min(520px, calc(100vw - 24px))"
          title={
            <div className="flex items-center justify-between gap-2 pr-4 sm:pr-6 flex-wrap">
              <span className="text-sm font-bold text-slate-900">Dispense Receipt Voucher</span>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer min-h-[30px]"
              >
                <Printer size={12} />
                <span>Print Voucher</span>
              </button>
            </div>
          }
        >
          <div
            id="dispense-voucher-print-area"
            className="p-4 border border-slate-200 rounded-lg bg-white mt-3 space-y-3"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <div className="text-base font-bold text-slate-900">Dr. Narendran Medical Center</div>
              <div className="text-xs text-slate-500">Pharmacy & Medicine Dispensing Unit</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Voucher Ref: #{selectedReceipt.reference_number || selectedReceipt.id.slice(0, 8)}
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-b border-dashed border-slate-300 pb-3">
              <div>
                <span className="text-slate-500">Date & Time: </span>
                <strong className="text-slate-900">
                  {dayjs(selectedReceipt.created_at).format('DD/MM/YYYY, hh:mm A')}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Dispensed By: </span>
                <strong className="text-slate-900">
                  {selectedReceipt.performer_name || 'Pharmacist'}
                </strong>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <span className="text-slate-500">Recipient / Reason: </span>
                <strong className="text-slate-900">
                  {selectedReceipt.reason || 'Dispensed to Patient'}
                </strong>
              </div>
            </div>

            {/* Medicine item */}
            <div className="py-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Medicine Issued
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {selectedReceipt.medicine_name || 'Prescribed Medicine'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedReceipt.strength} {selectedReceipt.strength_unit} (
                    {selectedReceipt.dosage_form || 'Tablet'})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-600">
                    -{Math.abs(selectedReceipt.quantity_change)} Units
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Stock Balance: {selectedReceipt.quantity_after}
                  </div>
                </div>
              </div>
            </div>

            {selectedReceipt.notes && (
              <div className="text-xs text-slate-600 p-2 bg-slate-50 rounded">
                <strong>Instructions: </strong> {selectedReceipt.notes}
              </div>
            )}

            {/* Signature Area */}
            <div className="flex justify-between pt-6 border-t border-slate-100 text-[11px] text-slate-400">
              <div>Pharmacist Signature</div>
              <div>Recipient Signature</div>
            </div>
          </div>
        </AntModal>
      )}
    </>
  );
}
