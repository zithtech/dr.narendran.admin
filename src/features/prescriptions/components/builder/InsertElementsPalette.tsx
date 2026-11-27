import {
  Activity,
  AlignLeft,
  FileCode,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Heading,
  HeartPulse,
  Hospital,
  Image as ImageIcon,
  Minus,
  MoveVertical,
  Pill,
  Plus,
  Stethoscope,
  Table as TableIcon,
  User,
} from 'lucide-react';
import React, { useState } from 'react';

import { DEFAULT_VITALS_FIELDS, type TemplateSectionType } from '../../types/template';

export interface InsertableElementDefinition {
  type: TemplateSectionType;
  title: string;
  category: 'basic' | 'clinical';
  description: string;
  icon: React.ReactNode;
  defaultProps?: Record<string, any>;
  badge?: string;
}

export const INSERTABLE_ELEMENTS: InsertableElementDefinition[] = [
  // Basic Document Elements
  {
    type: 'HEADING',
    title: 'Heading (H1 - H3)',
    category: 'basic',
    description: 'Section titles, clinic banners or custom headers',
    icon: <Heading size={16} className="text-blue-600" />,
    defaultProps: {
      text: 'PRESCRIPTION / CONSULTATION SUMMARY',
      level: 'h2',
      alignment: 'left',
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '2.5mm',
    },
  },
  {
    type: 'PARAGRAPH',
    title: 'Paragraph Text',
    category: 'basic',
    description: 'Editable rich text notes, instructions or disclaimers',
    icon: <AlignLeft size={16} className="text-emerald-600" />,
    defaultProps: {
      content: 'Enter consultation instructions, clinical observations, or special advice for the patient here.',
      alignment: 'left',
      fontSize: '11px',
      fontWeight: 'normal',
      lineHeight: '1.45',
      marginBottom: '3mm',
    },
  },
  {
    type: 'TABLE',
    title: 'Custom Table',
    category: 'basic',
    description: 'Customizable rows and columns for structured data',
    icon: <TableIcon size={16} className="text-indigo-600" />,
    defaultProps: {
      rows: 3,
      columns: 3,
      headers: ['#', 'Item / Investigation', 'Instructions'],
      data: [
        ['1', 'Complete Blood Count (CBC)', 'Fasting not required'],
        ['2', 'Serum Creatinine', 'Overnight fasting preferred'],
        ['3', 'Chest X-Ray (PA View)', 'Standard screening'],
      ],
      bordered: true,
      borderColor: '#c9c9c9',
      headerBg: '#f8fafc',
      cellPadding: '2mm 1.5mm',
    },
  },
  {
    type: 'CUSTOM_IMAGE',
    title: 'Image / Logo',
    category: 'basic',
    description: 'Insert clinic logo, accreditation seal or diagrams',
    icon: <ImageIcon size={16} className="text-purple-600" />,
    defaultProps: {
      imageUrl: '',
      altText: 'Prescription Image',
      width: '60mm',
      height: 'auto',
      alignment: 'center',
      objectFit: 'contain',
      maintainAspectRatio: true,
      caption: '',
    },
  },
  {
    type: 'DIVIDER',
    title: 'Divider Line',
    category: 'basic',
    description: 'Horizontal separator line with custom styling',
    icon: <Minus size={16} className="text-slate-500" />,
    defaultProps: {
      style: 'solid',
      thickness: '0.45mm',
      color: '#69c9eb',
      margin: '3mm',
      width: '100%',
      alignment: 'center',
    },
  },
  {
    type: 'SPACER',
    title: 'Vertical Spacer',
    category: 'basic',
    description: 'Adjustable spacing between letterhead blocks',
    icon: <MoveVertical size={16} className="text-amber-500" />,
    defaultProps: {
      height: '5mm',
    },
  },
  {
    type: 'PLACEHOLDER_BLOCK',
    title: 'Dynamic Placeholder',
    category: 'basic',
    description: 'Directly embed any dynamic patient/doctor token',
    icon: <FileCode size={16} className="text-teal-600" />,
    defaultProps: {
      token: '{{patient_name}}',
      label: 'Patient Name',
      prefix: 'Patient: ',
      fontSize: '11px',
      boldValue: true,
      alignment: 'left',
    },
  },

  // Clinical Elements
  {
    type: 'HEADER_LETTERHEAD',
    title: 'Hospital Letterhead & Doctor',
    category: 'clinical',
    description: 'Official hospital logo, doctor credentials & registration',
    icon: <Hospital size={16} className="text-blue-600" />,
    badge: 'Header',
    defaultProps: {
      showLogo: true,
      logoPosition: 'left',
      showTagline: true,
      showRegNumber: true,
      taglineText: 'QUALITY OF LIFE – LIFE AFTER CANCER – HELP YOU TO LIVE BETTER BEYOND CANCER',
    },
  },
  {
    type: 'PATIENT_DETAILS',
    title: 'Patient Demographics Grid',
    category: 'clinical',
    description: 'Patient Name, ID, Age/Gender, Appointment ID & Date',
    icon: <User size={16} className="text-sky-600" />,
    badge: 'Core',
    defaultProps: {
      showAgeGender: true,
      showAppointmentId: true,
      showBranch: true,
      showDate: true,
    },
  },
  {
    type: 'DOCTOR_DETAILS',
    title: 'Doctor Credentials Block',
    category: 'clinical',
    description: 'Doctor name, qualification, specialization & reg no',
    icon: <Stethoscope size={16} className="text-purple-600" />,
    defaultProps: {
      showDoctorName: true,
      showQualifications: true,
      showSpecialization: true,
      showRegistration: true,
      alignment: 'left',
    },
  },
  {
    type: 'VITALS_BLOCK',
    title: 'Physical Vitals & Metrics',
    category: 'clinical',
    description: 'Auto-formatted 4-column physical vitals table',
    icon: <HeartPulse size={16} className="text-rose-600" />,
    badge: 'Clinical',
    defaultProps: {
      style: 'bordered-table',
      showTitle: true,
      title: 'Physical Vitals & Metrics',
      columnsPerRow: 4,
      fields: DEFAULT_VITALS_FIELDS,
    },
  },
  {
    type: 'DIAGNOSIS_BLOCK',
    title: 'Diagnosis & ℞ Symbol',
    category: 'clinical',
    description: 'Consultation diagnosis & standard Latin ℞ prescription sign',
    icon: <Activity size={16} className="text-amber-600" />,
    badge: 'Rx',
    defaultProps: {
      showRxSymbol: true,
    },
  },
  {
    type: 'MEDICINES_TABLE',
    title: 'Prescribed Medications (Rx Table)',
    category: 'clinical',
    description: 'Drug dosage, frequency, duration & meal instructions',
    icon: <Pill size={16} className="text-emerald-600" />,
    badge: 'Mandatory',
    defaultProps: {
      showBorder: true,
      showInstructions: true,
      showDuration: true,
      showFrequency: true,
    },
  },
  {
    type: 'LAB_TESTS_BLOCK',
    title: 'Lab Tests & Diagnostic Investigations',
    category: 'clinical',
    description: 'Investigative lab tests with custom instructions',
    icon: <FileSpreadsheet size={16} className="text-violet-600" />,
    defaultProps: {
      title: 'Lab Tests & Investigations:',
    },
  },
  {
    type: 'ADVICE_NOTES_BLOCK',
    title: 'Advice, Instructions & Follow-up',
    category: 'clinical',
    description: 'Lifestyle advice, consultation notes & next review date',
    icon: <FileText size={16} className="text-teal-600" />,
    defaultProps: {
      title: 'Advice & Instructions:',
      showFollowUp: true,
    },
  },
  {
    type: 'SIGNATURE_BLOCK',
    title: 'Doctor E-Signature Block',
    category: 'clinical',
    description: 'Digital signature image, credentials & state council stamp',
    icon: <FileSignature size={16} className="text-blue-700" />,
    defaultProps: {
      alignment: 'right',
      showQualifications: true,
      showDoctorName: true,
      signatureWidth: '43mm',
      signatureHeight: '13mm',
    },
  },
  {
    type: 'FOOTER_LETTERHEAD',
    title: 'Hospital Footer & Contact Info',
    category: 'clinical',
    description: 'Hospital phone, email, address, website & ribbon banner',
    icon: <Hospital size={16} className="text-purple-700" />,
    badge: 'Footer',
    defaultProps: {
      showHospitalPhone: true,
      showHospitalEmail: true,
      showHospitalAddress: true,
      showWebsite: true,
      showRibbon: true,
      footerTheme: 'purple',
    },
  },
];

interface InsertElementsPaletteProps {
  onInsertElement: (element: InsertableElementDefinition) => void;
}

export const InsertElementsPalette: React.FC<InsertElementsPaletteProps> = ({
  onInsertElement,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'basic' | 'clinical'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredElements = INSERTABLE_ELEMENTS.filter((el) => {
    const matchesCat = filterCategory === 'all' || el.category === filterCategory;
    const matchesSearch =
      el.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white overflow-hidden box-border">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/80 shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Plus size={14} className="text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Insert Elements</span>
          <span className="ml-auto text-[10px] font-semibold text-slate-500">
            Click to add
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search document elements..."
          className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2 box-border min-w-0"
        />

        {/* Category Pills */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
              filterCategory === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({INSERTABLE_ELEMENTS.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('basic')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
              filterCategory === 'basic'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Basic Elements
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('clinical')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
              filterCategory === 'clinical'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Clinical Elements
          </button>
        </div>
      </div>

      {/* Elements List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredElements.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No matching elements found.
          </div>
        ) : (
          filteredElements.map((el) => (
            <button
              key={el.type + el.title}
              type="button"
              onClick={() => onInsertElement(el)}
              className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/40 transition-all cursor-pointer group flex items-start gap-2.5 shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-white group-hover:shadow-2xs border border-slate-200/80 flex items-center justify-center shrink-0 transition-colors">
                {el.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                    {el.title}
                  </span>
                  {el.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 shrink-0">
                      {el.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 mb-0 leading-tight line-clamp-2">
                  {el.description}
                </p>
              </div>

              <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center text-xs font-bold shrink-0 transition-colors">
                <Plus size={11} />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
