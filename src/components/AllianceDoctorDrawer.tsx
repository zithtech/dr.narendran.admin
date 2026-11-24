import {
  Building2,
  Check,
  Clock,
  Copy,
  FolderTree,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Stethoscope,
  Trash2,
  User,
} from 'lucide-react';
import { useState } from 'react';

import { formatDate, timeAgo } from '../lib/format';
import type { AllianceDoctor } from '../types/allianceDoctor';
import { Drawer } from './ui/Drawer';
import { Badge } from './ui/primitives';

interface AllianceDoctorDrawerProps {
  doctor: AllianceDoctor | null;
  onClose: () => void;
  onEdit: (doctor: AllianceDoctor) => void;
  onDelete?: (doctor: AllianceDoctor) => void;
  isEditable?: boolean;
  isDeletable?: boolean;
}

export default function AllianceDoctorDrawer({
  doctor,
  onClose,
  onEdit,
  onDelete,
  isEditable = true,
  isDeletable = true,
}: AllianceDoctorDrawerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!doctor) return null;

  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField((prev) => (prev === fieldKey ? null : prev));
    }, 2000);
  };

  const cleanName = doctor.name.trim();
  const hasDoctorPrefix = /^Dr\.?\s+/i.test(cleanName);
  const displayName = hasDoctorPrefix ? cleanName : `Dr. ${cleanName}`;
  const nameWithoutDr = cleanName.replace(/^Dr\.?\s+/i, '');
  const initials =
    nameWithoutDr
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'DR';

  // Construct formatted single line address
  const addressParts = [
    doctor.address_line_1,
    doctor.address_line_2,
    doctor.city,
    doctor.district,
    doctor.state ? `${doctor.state}${doctor.pincode ? ` - ${doctor.pincode}` : ''}` : doctor.pincode,
    doctor.country,
  ].filter(Boolean);
  const fullAddressString = addressParts.join(', ');

  const footer = (
    <div className="flex items-center justify-between w-full gap-2.5">
      <div>
        {isDeletable && onDelete && (
          <button
            type="button"
            className="ui-btn ui-btn-danger text-xs h-9 px-3.5 inline-flex items-center gap-1.5 cursor-pointer"
            onClick={() => onDelete(doctor)}
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="ui-btn ui-btn-neutral text-xs h-9 px-4 cursor-pointer"
          onClick={onClose}
        >
          Close
        </button>

        {isEditable && (
          <button
            type="button"
            className="ui-btn ui-btn-primary text-xs h-9 px-4.5 inline-flex items-center gap-1.5 font-semibold shadow-sm cursor-pointer"
            onClick={() => onEdit(doctor)}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              borderColor: '#1d4ed8',
              color: '#ffffff',
            }}
          >
            <Pencil size={14} />
            <span>Edit Doctor</span>
          </button>
        )}
      </div>
    </div>
  );

  const stats = [
    {
      label: 'Specialization',
      value: (
        <span className="font-bold text-blue-700 text-xs truncate max-w-[150px] block" title={doctor.specialization || 'General'}>
          {doctor.specialization || 'General'}
        </span>
      ),
      icon: <Stethoscope size={13} className="text-blue-600" />,
    },
    {
      label: 'Category',
      value: (
        <span className="font-semibold text-slate-800 text-xs truncate max-w-[150px] block" title={doctor.category || 'Consultant'}>
          {doctor.category || 'Consultant'}
        </span>
      ),
      icon: <FolderTree size={13} className="text-slate-500" />,
    },
    {
      label: 'Experience',
      value: (
        <span className="font-semibold text-slate-800 text-xs">
          {doctor.experience_years !== null && doctor.experience_years !== undefined
            ? `${doctor.experience_years} Years`
            : '—'}
        </span>
      ),
      icon: <Clock size={13} className="text-amber-500" />,
    },
    {
      label: 'Status',
      value: (
        <Badge tone={doctor.status === 'ACTIVE' ? 'green' : 'neutral'}>
          {doctor.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      ),
      icon: (
        <ShieldCheck
          size={13}
          className={doctor.status === 'ACTIVE' ? 'text-emerald-500' : 'text-slate-400'}
        />
      ),
    },
  ];

  return (
    <Drawer
      open={Boolean(doctor)}
      onClose={onClose}
      label="Alliances – Doctor Profile"
      footer={footer}
      stats={stats}
      width="min(660px, 100vw)"
      hero={
        <div className="p-5 bg-gradient-to-br from-blue-50/80 via-slate-50 to-indigo-50/40 border-b border-blue-100/70">
          <div className="flex items-start gap-4">
            {/* Doctor Avatar with gradient & initials */}
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-white flex items-center justify-center font-extrabold text-xl sm:text-2xl shadow-md shrink-0 border border-blue-400/40 select-none"
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0284c7 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
              }}
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {displayName}
                </h2>
                <Badge tone={doctor.status === 'ACTIVE' ? 'green' : 'neutral'}>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        doctor.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {doctor.status === 'ACTIVE' ? 'Active Doctor' : 'Inactive'}
                  </span>
                </Badge>
              </div>

              {/* Badges strip */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                {doctor.qualification && (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200/90 shadow-2xs">
                    <GraduationCap size={12} className="text-blue-600" />
                    <span>{doctor.qualification}</span>
                  </span>
                )}
                {doctor.category && (
                  <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-md border border-slate-200/60 font-medium">
                    <FolderTree size={12} className="text-slate-500" />
                    <span>{doctor.category}</span>
                  </span>
                )}
                {doctor.specialization && (
                  <Badge tone="blue">
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope size={11} className="text-blue-600" />
                      <span>{doctor.specialization}</span>
                    </span>
                  </Badge>
                )}
              </div>

              {/* Hospital affiliation */}
              {doctor.hospital_clinic_name && (
                <div className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                    <Building2 size={12} />
                  </div>
                  <span>{doctor.hospital_clinic_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-5 space-y-4">
        {/* Card 1: Doctor Information */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-4.5 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-3 mb-3.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <User size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Doctor Information
              </h3>
              <p className="text-[11px] text-slate-400">Personal &amp; clinical credentials</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Doctor Full Name</span>
              <span className="text-slate-900 font-bold flex items-center gap-1.5">
                <Stethoscope size={13} className="text-blue-500 shrink-0" />
                <span>{doctor.name}</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Category</span>
              <span className="text-slate-800 font-semibold">{doctor.category || '—'}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Specialization</span>
              <span className="text-blue-700 font-bold">{doctor.specialization || '—'}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Qualification</span>
              <span className="text-slate-800 font-semibold">{doctor.qualification || '—'}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Experience</span>
              <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                <Clock size={13} className="text-amber-500 shrink-0" />
                <span>
                  {doctor.experience_years !== null && doctor.experience_years !== undefined
                    ? `${doctor.experience_years} ${doctor.experience_years === 1 ? 'Year' : 'Years'}`
                    : '—'}
                </span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Gender</span>
              <span className="text-slate-800 font-semibold capitalize">
                {doctor.gender ? doctor.gender.toLowerCase() : '—'}
              </span>
            </div>

            {doctor.registration_number && (
              <div className="sm:col-span-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium mb-0.5">
                    Medical Registration Number
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {doctor.registration_number}
                  </span>
                </div>
                <Badge tone="green">
                  <span className="flex items-center gap-1 text-[11px]">
                    <ShieldCheck size={12} /> Verified Registration
                  </span>
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Contact Information */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-4.5 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-3 mb-3.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Phone size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Contact Information
              </h3>
              <p className="text-[11px] text-slate-400">Direct mobile lines and official email address</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Primary Mobile */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                  <Phone size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Mobile Number (Primary)
                  </span>
                  {doctor.mobile_number ? (
                    <a
                      href={`tel:${doctor.mobile_number}`}
                      className="text-xs sm:text-sm font-bold font-mono text-blue-600 hover:text-blue-800 hover:underline truncate block"
                    >
                      {doctor.mobile_number}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Not recorded</span>
                  )}
                </div>
              </div>

              {doctor.mobile_number && (
                <button
                  type="button"
                  onClick={() => handleCopy(doctor.mobile_number!, 'mobile')}
                  className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white transition-colors cursor-pointer"
                  title="Copy Phone Number"
                >
                  {copiedField === 'mobile' ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              )}
            </div>

            {/* Alternate Mobile */}
            {doctor.alternate_mobile_number && (
              <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                    <Phone size={15} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Alternate Mobile Number
                    </span>
                    <a
                      href={`tel:${doctor.alternate_mobile_number}`}
                      className="text-xs sm:text-sm font-bold font-mono text-blue-600 hover:text-blue-800 hover:underline truncate block"
                    >
                      {doctor.alternate_mobile_number}
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(doctor.alternate_mobile_number!, 'alt_mobile')}
                  className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white transition-colors cursor-pointer"
                  title="Copy Alternate Number"
                >
                  {copiedField === 'alt_mobile' ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            )}

            {/* Email Address */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0">
                  <Mail size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 font-medium block">Email Address</span>
                  {doctor.email ? (
                    <a
                      href={`mailto:${doctor.email}`}
                      className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate block"
                    >
                      {doctor.email}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Not recorded</span>
                  )}
                </div>
              </div>

              {doctor.email && (
                <button
                  type="button"
                  onClick={() => handleCopy(doctor.email!, 'email')}
                  className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white transition-colors cursor-pointer"
                  title="Copy Email Address"
                >
                  {copiedField === 'email' ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Address Information */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-4.5 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-3 mb-3.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <MapPin size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Address Information
              </h3>
              <p className="text-[11px] text-slate-400">Clinic and postal address particulars</p>
            </div>
          </div>

          {/* Formatted address badge if available */}
          {fullAddressString && (
            <div className="p-3 mb-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-slate-800 flex items-start gap-2.5 leading-relaxed font-medium">
              <MapPin size={15} className="text-blue-600 shrink-0 mt-0.5" />
              <span>{fullAddressString}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Address Line 1</span>
              <span className="text-slate-800 font-semibold">{doctor.address_line_1 || '—'}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Address Line 2</span>
              <span className="text-slate-800 font-semibold">{doctor.address_line_2 || '—'}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">City</span>
              <span className="text-slate-800 font-semibold">{doctor.city || '—'}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">District</span>
              <span className="text-slate-800 font-semibold">{doctor.district || '—'}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">State</span>
              <span className="text-slate-800 font-semibold">{doctor.state || '—'}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Pincode</span>
              <span className="text-slate-800 font-semibold font-mono">{doctor.pincode || '—'}</span>
            </div>

            <div className="sm:col-span-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[11px] font-medium mb-0.5">Country</span>
              <span className="text-slate-800 font-semibold">{doctor.country || 'India'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Hospital / Clinic & Notes */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-4.5 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-3 mb-3.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Hospital Affiliation &amp; Notes
              </h3>
              <p className="text-[11px] text-slate-400">Institutional practice details and descriptive notes</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                <Building2 size={16} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">
                  Hospital / Clinic Name
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {doctor.hospital_clinic_name || 'Independent Private Practice'}
                </span>
              </div>
            </div>

            {doctor.description && (
              <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium block mb-1">
                  Description / Referral Notes
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                  {doctor.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Audit Metadata */}
        <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
          <span>Added: {formatDate(doctor.created_at)}</span>
          {doctor.updated_at && doctor.updated_at !== doctor.created_at && (
            <span>Updated: {timeAgo(doctor.updated_at)}</span>
          )}
        </div>
      </div>
    </Drawer>
  );
}
