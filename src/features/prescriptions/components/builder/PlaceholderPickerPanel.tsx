import { Check, Copy, GripVertical, Plus, Search, Sparkles } from 'lucide-react';
import React, { useState } from 'react';

export interface TokenItem {
  token: string;
  label: string;
  description: string;
  category: 'Hospital' | 'Doctor' | 'Patient' | 'Clinical' | 'Prescription';
}

export const SYSTEM_TOKENS: TokenItem[] = [
  // Hospital
  { token: '{{hospital_name}}', label: 'Hospital Name', description: 'Official registered name', category: 'Hospital' },
  { token: '{{hospital_address}}', label: 'Hospital Address', description: 'Full address line', category: 'Hospital' },
  { token: '{{hospital_phone}}', label: 'Hospital Phone', description: 'Main reception/helpline phone', category: 'Hospital' },
  { token: '{{hospital_email}}', label: 'Hospital Email', description: 'Contact inquiry email', category: 'Hospital' },
  { token: '{{hospital_website}}', label: 'Hospital Website', description: 'Website URL', category: 'Hospital' },
  { token: '{{hospital_logo}}', label: 'Hospital Logo', description: 'Brand letterhead logo tag', category: 'Hospital' },
  { token: '{{branch_name}}', label: 'Branch Name', description: 'Doctor/appointment branch location', category: 'Hospital' },

  // Doctor
  { token: '{{doctor_name}}', label: 'Doctor Name', description: 'Full doctor name', category: 'Doctor' },
  { token: '{{doctor_qualification}}', label: 'Doctor Qualification', description: 'e.g. MBBS, MD (RT)', category: 'Doctor' },
  { token: '{{doctor_specialization}}', label: 'Specialization', description: 'e.g. Consultant Oncologist', category: 'Doctor' },
  { token: '{{doctor_registration_number}}', label: 'Medical Reg No', description: 'State Medical Council number', category: 'Doctor' },
  { token: '{{doctor_signature}}', label: 'Doctor E-Signature', description: 'Signature image or styled script', category: 'Doctor' },
  { token: '{{doctor_phone}}', label: 'Doctor Phone', description: 'Direct contact phone', category: 'Doctor' },

  // Patient
  { token: '{{patient_name}}', label: 'Patient Name', description: 'Full patient name', category: 'Patient' },
  { token: '{{patient_id}}', label: 'Patient Code / ID', description: 'Standardized Patient Code', category: 'Patient' },
  { token: '{{patient_age}}', label: 'Age', description: 'Calculated patient age', category: 'Patient' },
  { token: '{{patient_gender}}', label: 'Gender', description: 'Male / Female / Other', category: 'Patient' },
  { token: '{{patient_phone}}', label: 'Phone', description: 'Mobile contact number', category: 'Patient' },
  { token: '{{patient_address}}', label: 'Address', description: 'Residential address', category: 'Patient' },

  // Clinical
  { token: '{{vitals_html}}', label: 'Physical Vitals Table', description: 'Auto-formatted 4-column metrics grid', category: 'Clinical' },
  { token: '{{blood_pressure}}', label: 'Blood Pressure', description: 'e.g. 120/80 mmHg', category: 'Clinical' },
  { token: '{{pulse_rate}}', label: 'Pulse Rate', description: 'e.g. 74 bpm', category: 'Clinical' },
  { token: '{{body_temperature}}', label: 'Body Temperature', description: 'e.g. 98.4 F', category: 'Clinical' },
  { token: '{{blood_sugar}}', label: 'Blood Sugar', description: 'Fasting / Random blood glucose', category: 'Clinical' },
  { token: '{{blood_group}}', label: 'Blood Group', description: 'e.g. O+ve, B+ve', category: 'Clinical' },
  { token: '{{patient_weight}}', label: 'Weight', description: 'e.g. 68 kg', category: 'Clinical' },
  { token: '{{patient_height}}', label: 'Height', description: 'e.g. 172 cm', category: 'Clinical' },
  { token: '{{patient_bmi}}', label: 'BMI', description: 'Body Mass Index', category: 'Clinical' },

  // Prescription
  { token: '{{medicines_table}}', label: 'Prescribed Medications', description: 'Complete Rx medicine dosage table', category: 'Prescription' },
  { token: '{{prescription_id}}', label: 'Prescription Number', description: 'Unique prescription identifier', category: 'Prescription' },
  { token: '{{prescription_date}}', label: 'Prescription Date', description: 'Consultation date', category: 'Prescription' },
  { token: '{{diagnosis}}', label: 'Diagnosis', description: 'Clinical assessment and diagnosis', category: 'Prescription' },
  { token: '{{symptoms}}', label: 'Symptoms', description: 'Reported symptoms', category: 'Prescription' },
  { token: '{{lab_tests}}', label: 'Lab Tests Table', description: 'Recommended diagnostic tests', category: 'Prescription' },
  { token: '{{additional_notes}}', label: 'Advice / Notes', description: 'Diet, exercise & clinical advice', category: 'Prescription' },
  { token: '{{follow_up_date}}', label: 'Follow-up Date', description: 'Next scheduled review date', category: 'Prescription' },
];

export interface PlaceholderPickerPanelProps {
  onInsertToken?: (token: string) => void;
}

export const PlaceholderPickerPanel: React.FC<PlaceholderPickerPanelProps> = ({ onInsertToken }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [insertedToken, setInsertedToken] = useState<string | null>(null);

  const categories = ['All', 'Hospital', 'Doctor', 'Patient', 'Clinical', 'Prescription'];

  const filteredTokens = SYSTEM_TOKENS.filter((t) => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch =
      t.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopy = (token: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleInsert = (token: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onInsertToken) {
      onInsertToken(token);
      setInsertedToken(token);
      setTimeout(() => setInsertedToken(null), 2000);
    }
  };

  const handleDragStart = (e: React.DragEvent, token: string) => {
    e.dataTransfer.setData('text/plain', token);
    e.dataTransfer.setData('application/x-token', token);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-slate-50 overflow-hidden box-border">
      {/* Search & Category Filter Header */}
      <div className="p-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={14} className="text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Dynamic Placeholders</span>
          <span className="ml-auto text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
            Click Insert or Drag
          </span>
        </div>

        <div className="relative mb-2">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search variables..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Helpful Hint */}
      <div className="px-3 py-1.5 bg-blue-50/60 border-b border-blue-100/60 text-[10.5px] text-blue-700 flex items-center justify-between shrink-0">
        <span>Click <b>+ Insert</b> or drag token into Canvas / Cells</span>
      </div>

      {/* Tokens List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredTokens.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">No placeholders match search.</div>
        ) : (
          filteredTokens.map((item) => {
            const isCopied = copiedToken === item.token;
            const isInserted = insertedToken === item.token;

            return (
              <div
                key={item.token}
                draggable
                onDragStart={(e) => handleDragStart(e, item.token)}
                onClick={() => handleInsert(item.token)}
                className="group p-2.5 rounded-lg bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer relative select-none"
                title="Click to insert into canvas or drag into table cells"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <GripVertical size={12} className="text-slate-300 group-hover:text-blue-500 shrink-0 cursor-grab" />
                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 truncate">
                      {item.token}
                    </span>
                  </div>

                  {/* Actions: Insert & Copy */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleInsert(item.token, e)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer ${
                        isInserted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      title="Insert token into current active element or canvas"
                    >
                      {isInserted ? (
                        <>
                          <Check size={11} />
                          <span>Inserted</span>
                        </>
                      ) : (
                        <>
                          <Plus size={11} />
                          <span>Insert</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCopy(item.token, e)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
                      title="Copy token to clipboard"
                    >
                      {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-slate-800">{item.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-slate-200 bg-white text-[10px] text-slate-400 text-center shrink-0">
        All tokens are automatically populated with real patient data during consultation.
      </div>
    </div>
  );
};
