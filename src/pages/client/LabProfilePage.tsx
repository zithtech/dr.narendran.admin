import { App } from 'antd';
import {
  Building2,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
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

  // Edit Form Fields
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

      // Update cached lab object in localStorage so sidebar updates instantly
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

  const isContactVisible =
    profile?.contact_visibility !== undefined ? Boolean(profile.contact_visibility) : true;

  return (
    <div className="w-full p-6 space-y-6">
      {/* ── View-Only Hero Banner ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 flex-shrink-0">
              <Building2 size={30} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {profile?.name || 'Laboratory Profile'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={12} />
                  <span>Verified Facility</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
                <span>Diagnostic Center</span>
                {profile?.city && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <MapPin size={13} className="text-slate-400" />
                      {profile.city}
                    </span>
                  </>
                )}
                {profile?.total_services !== undefined && (
                  <>
                    <span>•</span>
                    <span className="text-sky-700 font-medium">
                      {profile.total_services} Services Offered
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Edit Profile Action Button */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {profile?.map_link && (
              <a
                href={profile.map_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                <span>Google Maps</span>
                <ExternalLink size={13} />
              </a>
            )}
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs sm:text-sm transition-colors shadow-sm"
            >
              <Edit3 size={15} />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── View-Only Structured Detail Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Contact Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                <Phone size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Communication & Contact</h2>
                <p className="text-xs text-slate-400">Direct referral and patient outreach lines</p>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-50 gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Phone Number
              </span>
              {profile?.phone ? (
                <a
                  href={`tel:${profile.phone}`}
                  className="font-medium text-sky-600 hover:underline flex items-center gap-1.5"
                >
                  <Phone size={13} className="text-slate-400" />
                  <span>{profile.phone}</span>
                </a>
              ) : (
                <span className="text-xs text-slate-400 italic">Not provided</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-50 gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Official Email
              </span>
              {profile?.email ? (
                <a
                  href={`mailto:${profile.email}`}
                  className="font-medium text-sky-600 hover:underline flex items-center gap-1.5"
                >
                  <Mail size={13} className="text-slate-400" />
                  <span>{profile.email}</span>
                </a>
              ) : (
                <span className="text-xs text-slate-400 italic">Not provided</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Patient Visibility
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isContactVisible
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isContactVisible ? (
                  <>
                    <Eye size={13} />
                    <span>Public in Directory</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={13} />
                    <span>Private / Hidden</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Operating Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Clock size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Operating Schedule</h2>
                <p className="text-xs text-slate-400">Facility timings for sample drop-off & tests</p>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-50 gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Opening Hours
              </span>
              <span className="font-semibold text-slate-800">
                {profile?.start_time && profile?.end_time
                  ? `${profile.start_time} — ${profile.end_time}`
                  : profile?.start_time || profile?.end_time || (
                      <span className="text-xs text-slate-400 italic font-normal">
                        Schedule not configured
                      </span>
                    )}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-50 gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Current Status
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Operational</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Linked Services
              </span>
              <span className="font-semibold text-slate-800">
                {profile?.total_services || 0} Diagnostic Investigations
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Physical Address & Map Location (Spans full width) */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                <MapPin size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Physical Facility & Location</h2>
                <p className="text-xs text-slate-400">Complete clinic / diagnostic center address</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Street Address
                </span>
                <p className="font-medium text-slate-800 leading-relaxed">
                  {profile?.address_line_1 || (
                    <span className="text-xs text-slate-400 italic font-normal">
                      No street address provided
                    </span>
                  )}
                  {profile?.address_line_2 && (
                    <>
                      <br />
                      <span className="text-slate-600 text-xs">{profile.address_line_2}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50">
                <div>
                  <span className="block text-[11px] font-semibold uppercase text-slate-400">
                    City
                  </span>
                  <span className="text-xs font-medium text-slate-800">
                    {profile?.city || '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase text-slate-400">
                    State
                  </span>
                  <span className="text-xs font-medium text-slate-800">
                    {profile?.state || '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase text-slate-400">
                    Pincode
                  </span>
                  <span className="text-xs font-medium text-slate-800">
                    {profile?.pincode || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:border-l sm:border-slate-100 sm:pl-6">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Google Maps Location Link
                </span>
                {profile?.map_link ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 font-mono truncate max-w-sm bg-slate-50 p-2 rounded border border-slate-200">
                      {profile.map_link}
                    </p>
                    <a
                      href={profile.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No map coordinate or location link added. Click "Edit Profile" to provide a map
                    URL for referrals.
                  </p>
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
                    Update facility details, operating hours, and location
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* General Info */}
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
                    placeholder="e.g. City Center Lab"
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
                        placeholder="e.g. lab@metrodiagnostics.com"
                        className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>
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

              {/* Operating Hours & Visibility */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Hours & Public Directory
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
                      Public Contact Visibility
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Display phone and email on patient referral confirmations
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

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
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
