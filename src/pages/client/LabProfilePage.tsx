import { App } from 'antd';
import {
  Building2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FlaskConical,
  Mail,
  MapPin,
  Phone,
  Save,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

interface LabProfile {
  id: string;
  name: string;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  map_link?: string | null;
  contact_visibility?: boolean;
  total_services?: number;
}

export default function LabProfilePage() {
  const { message } = App.useApp();
  const [profile, setProfile] = useState<LabProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Fields for Edit Modal
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [contactVisibility, setContactVisibility] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await api.get('lab-portal/profile');
      const data: LabProfile = response.data;
      setProfile(data);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to load laboratory profile.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  const openEditModal = () => {
    if (!profile) return;
    setName(profile.name || '');
    setPhone(profile.phone || '');
    setEmail(profile.email || '');
    setAddressLine1(profile.address_line_1 || '');
    setAddressLine2(profile.address_line_2 || '');
    setCity(profile.city || '');
    setState(profile.state || '');
    setPincode(profile.pincode || '');
    setStartTime(profile.start_time || '');
    setEndTime(profile.end_time || '');
    setMapLink(profile.map_link || '');
    setContactVisibility(
      profile.contact_visibility !== undefined ? Boolean(profile.contact_visibility) : true,
    );
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      void message.error('Laboratory Name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address_line_1: addressLine1.trim() || null,
        address_line_2: addressLine2.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        start_time: startTime.trim() || null,
        end_time: endTime.trim() || null,
        map_link: mapLink.trim() || null,
        contact_visibility: contactVisibility,
      };

      const res = await api.put('lab-portal/profile', payload);
      setProfile(res.data);

      // Update cached lab object in localStorage so sidebar user footer updates instantly
      const currentLabStr = localStorage.getItem('labClientLab');
      if (currentLabStr) {
        try {
          const currentLab = JSON.parse(currentLabStr);
          localStorage.setItem(
            'labClientLab',
            JSON.stringify({ ...currentLab, name: res.data.name }),
          );
        } catch {}
      }

      void message.success('Laboratory profile updated successfully!');
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to update laboratory profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  const isPublic =
    profile?.contact_visibility !== undefined ? Boolean(profile.contact_visibility) : true;

  const operatingHours =
    profile?.start_time && profile?.end_time
      ? `${profile.start_time} — ${profile.end_time}`
      : profile?.start_time || profile?.end_time || 'Schedule not configured';

  const fullStreetAddress = [profile?.address_line_1, profile?.address_line_2]
    .filter(Boolean)
    .join(', ');

  const cityStatePincode = [profile?.city, profile?.state, profile?.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="w-full p-5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto box-border">
      {/* ── 1. Clean Light Header ── */}
      <div className="rounded-2xl bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              <Building2 size={26} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  {profile?.name || 'Laboratory Profile'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Facility
                </span>
                {profile?.city && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                    <MapPin size={11} className="text-slate-500" />
                    {profile.city}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Diagnostic facility operational profile, contact details, operating schedule, and location coordinates.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            {profile?.map_link && (
              <a
                href={profile.map_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200"
              >
                <span>Google Maps</span>
                <ExternalLink size={13} />
              </a>
            )}
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Edit3 size={15} />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Single View-Only Details Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        {/* Facility Title & Avatar Banner */}
        <div className="flex items-center gap-4.5 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center text-2xl font-extrabold shrink-0">
            {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'LP'}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {profile?.name || 'Diagnostic Laboratory'}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isPublic
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>{isPublic ? 'Public in Directory' : 'Private / Unlisted'}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {fullStreetAddress || cityStatePincode || 'Complete diagnostic center profile'}
            </p>
          </div>
        </div>

        {/* ── All Details in Single Organized Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5 text-sm">
          {/* 1. Laboratory Name */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Laboratory Name
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {profile?.name || '—'}
              </div>
            </div>
          </div>

          {/* 2. Contact Phone */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
              <Phone size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Contact Phone
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {profile?.phone ? (
                  <a href={`tel:${profile.phone}`} className="hover:text-sky-600 transition-colors">
                    {profile.phone}
                  </a>
                ) : (
                  <span className="text-slate-400 italic font-normal">Not configured</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Official Email */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <Mail size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Official Email
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {profile?.email ? (
                  <a href={`mailto:${profile.email}`} className="hover:text-sky-600 transition-colors">
                    {profile.email}
                  </a>
                ) : (
                  <span className="text-slate-400 italic font-normal">Not configured</span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Operating Hours */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Sample Collection Hours
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {operatingHours}
              </div>
            </div>
          </div>

          {/* 5. Directory Presence */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              {isPublic ? <Eye size={16} /> : <EyeOff size={16} />}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Referral Directory Visibility
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {isPublic ? 'Public in Doctor Referral List' : 'Direct Referrals Only'}
              </div>
            </div>
          </div>

          {/* 6. Diagnostic Catalog */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 mt-0.5">
              <FlaskConical size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Configured Investigations
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {profile?.total_services || 0} Clinical Tests Offered
              </div>
            </div>
          </div>

          {/* 7. Street Address */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Street Address
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {fullStreetAddress || <span className="text-slate-400 italic font-normal">Not provided</span>}
              </div>
            </div>
          </div>

          {/* 8. City, State & Pincode */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                City / State / Pincode
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {cityStatePincode || <span className="text-slate-400 italic font-normal">Not provided</span>}
              </div>
            </div>
          </div>

          {/* 9. Google Maps Link */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100/90 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <ExternalLink size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Google Maps Location
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
                {profile?.map_link ? (
                  <a
                    href={profile.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:text-sky-700 inline-flex items-center gap-1"
                  >
                    <span>Open Navigation Link</span>
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="text-slate-400 italic font-normal">No map link added</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Edit Laboratory Profile</h2>
                  <p className="text-xs text-slate-500">
                    Update facility details, contact information, hours, and address
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  General & Communication
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Lab Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. City Central Lab"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Official Email
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. lab@example.com"
                        className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Operating Hours & Visibility */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Operating Hours & Public Directory
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Opening Time
                    </label>
                    <div className="relative">
                      <Clock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        placeholder="e.g. 07:30 AM"
                        className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Closing Time
                    </label>
                    <div className="relative">
                      <Clock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        placeholder="e.g. 09:30 PM"
                        className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Public Referral Directory Visibility
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Display phone and email on doctor referral sheets and patient receipts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContactVisibility(!contactVisibility)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      contactVisibility ? 'bg-sky-600' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={contactVisibility}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        contactVisibility ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Physical Location */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Address & Coordinates
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Building / Street address"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Landmark / Area"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chennai"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Tamil Nadu"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 600001"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Google Maps Link
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="url"
                      value={mapLink}
                      onChange={(e) => setMapLink(e.target.value)}
                      placeholder="https://maps.google.com/?q=..."
                      className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Changes…</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
