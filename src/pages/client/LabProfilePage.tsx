import { App } from 'antd';
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FlaskConical,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Tag,
  TestTube2,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  validateLabAddressLine,
  validateLabCity,
  validateLabEmail,
  validateLabName,
  validateLabPhone,
  validateLabPincode,
  validateLabState,
} from '../../components/LabModal';
import { Modal } from '../../components/ui/Modal';
import { Badge, cx } from '../../components/ui/primitives';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';

export interface LabProfile {
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

export interface LabServiceItem {
  id: string;
  name: string;
  service_code?: string | null;
  category?: string | null;
  sample_type?: string | null;
  price?: number | string | null;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string | null;
  created_at?: string;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function LabProfilePage() {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<LabProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'schedule' | 'location'>('overview');

  // Custom Logo State & File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Services Catalog State (Loaded on demand when services tab is selected)
  const [services, setServices] = useState<LabServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewingService, setViewingService] = useState<LabServiceItem | null>(null);

  // Edit Drawer State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Fields for Edit Drawer
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<LabProfile>('lab-portal/profile');
      setProfile(response.data);

      // Check stored custom logo for this facility
      if (response.data?.id) {
        const storedLogo = localStorage.getItem(`labClientLogo_${response.data.id}`);
        if (storedLogo) {
          setCustomLogo(storedLogo);
        }
      }
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to load laboratory profile.'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchProfile]);

  // Load services lazily when Services tab is opened
  const fetchServices = useCallback(async () => {
    try {
      setServicesLoading(true);
      const res = await api.get<LabServiceItem[]>('lab-portal/services');
      const list = Array.isArray(res.data) ? res.data : [];
      setServices(list);
      setServicesLoaded(true);
    } catch {
      setServices([]);
      setServicesLoaded(true);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'services' && !servicesLoaded && !servicesLoading) {
      const timer = setTimeout(() => {
        void fetchServices();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, servicesLoaded, servicesLoading, fetchServices]);

  // Handle Logo Upload via File Input
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      void message.error('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      void message.error('Logo image size exceeds 5MB limit.');
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomLogo(dataUrl);
      if (profile?.id) {
        localStorage.setItem(`labClientLogo_${profile.id}`, dataUrl);
      }
      setIsUploadingLogo(false);
      void message.success('Laboratory logo updated successfully!');
    };
    reader.onerror = () => {
      setIsUploadingLogo(false);
      void message.error('Failed to read image file.');
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setCustomLogo(null);
    if (profile?.id) {
      localStorage.removeItem(`labClientLogo_${profile.id}`);
    }
    void message.success('Facility logo removed.');
  };

  const openEditModal = () => {
    if (!profile) return;
    setName(profile.name ?? '');
    setPhone(profile.phone ?? '');
    setEmail(profile.email ?? '');
    setAddressLine1(profile.address_line_1 ?? '');
    setAddressLine2(profile.address_line_2 ?? '');
    setCity(profile.city ?? '');
    setState(profile.state ?? '');
    setPincode(profile.pincode ?? '');
    setStartTime(profile.start_time ?? '');
    setEndTime(profile.end_time ?? '');
    setMapLink(profile.map_link ?? '');
    setContactVisibility(
      profile.contact_visibility !== undefined ? Boolean(profile.contact_visibility) : true,
    );
    setFieldErrors({});
    setIsEditModalOpen(true);
  };

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};

    const nameErr = validateLabName(name);
    if (nameErr) errors.name = nameErr;

    const phoneErr = validateLabPhone(phone);
    if (phoneErr) errors.phone = phoneErr;

    const emailErr = validateLabEmail(email);
    if (emailErr) errors.email = emailErr;

    const addr1Err = validateLabAddressLine(addressLine1, 'Address Line 1');
    if (addr1Err) errors.addressLine1 = addr1Err;

    const addr2Err = validateLabAddressLine(addressLine2, 'Address Line 2');
    if (addr2Err) errors.addressLine2 = addr2Err;

    const cityErr = validateLabCity(city);
    if (cityErr) errors.city = cityErr;

    const stateErr = validateLabState(state);
    if (stateErr) errors.state = stateErr;

    const pinErr = validateLabPincode(pincode);
    if (pinErr) errors.pincode = pinErr;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAllFields()) {
      const firstError = Object.values(fieldErrors)[0] ?? 'Please correct errors in the form.';
      void message.error(firstError);
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

      const res = await api.put<LabProfile>('lab-portal/profile', payload);
      setProfile(res.data);

      // Update cached lab object in localStorage so topbar and sidebar lab names update instantly
      const currentLabStr = localStorage.getItem('labClientLab');
      if (currentLabStr) {
        try {
          const currentLab = JSON.parse(currentLabStr) as Record<string, unknown>;
          localStorage.setItem(
            'labClientLab',
            JSON.stringify({ ...currentLab, name: res.data.name }),
          );
        } catch {
          // Ignore parsing errors for stored lab object
        }
      }

      void message.success('Laboratory profile updated successfully!');
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to update laboratory profile.'));
    } finally {
      setSaving(false);
    }
  };

  // Filtered services for the Services & Catalog tab
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const term = serviceSearch.trim().toLowerCase();
      const matchesSearch =
        !term ||
        s.name.toLowerCase().includes(term) ||
        Boolean(s.service_code?.toLowerCase().includes(term)) ||
        Boolean(s.category?.toLowerCase().includes(term));

      const matchesStatus =
        serviceStatusFilter === 'ALL' || s.status === serviceStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [services, serviceSearch, serviceStatusFilter]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2.5 text-slate-400">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent" />
        <span className="text-xs text-slate-500 font-medium">Loading laboratory profile…</span>
      </div>
    );
  }

  const isPublic =
    profile?.contact_visibility !== undefined ? Boolean(profile.contact_visibility) : true;

  const operatingHours =
    profile?.start_time && profile?.end_time
      ? `${profile.start_time} — ${profile.end_time}`
      : profile?.start_time ?? (profile?.end_time ?? 'Schedule not configured');

  const fullStreetAddress = [profile?.address_line_1, profile?.address_line_2]
    .filter(Boolean)
    .join(', ');

  const cityStatePincode = [profile?.city, profile?.state, profile?.pincode]
    .filter(Boolean)
    .join(', ');

  const initials = profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'LP';

  return (
    <div className="ui-page space-y-3">
      {/* ── Executive Page Header Matching HMS Admin Pattern ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              {profile?.name ?? 'Laboratory Profile'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified Facility
            </span>
            {profile?.city && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                <MapPin size={11} className="text-slate-400" />
                <span>{profile.city}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Diagnostic facility operational profile, contact credentials, operating schedule, and laboratory services.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              void fetchProfile();
              if (activeTab === 'services') {
                void fetchServices();
              }
            }}
            disabled={loading}
            aria-label="Refresh"
            title="Refresh profile details"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              void navigate('/client/services');
            }}
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FlaskConical size={13} className="text-blue-600" />
            <span>Manage Catalog</span>
          </button>

          {profile?.map_link && (
            <a
              href={profile.map_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            >
              <span>Google Maps</span>
              <ExternalLink size={12} className="text-slate-400" />
            </a>
          )}

          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Edit3 size={13} />
            <span>Edit Profile</span>
          </button>
        </div>
      </header>

      {/* ── Executive Facility Profile Header Card with Logo Upload Interface ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Logo / Monogram Avatar with Inline Upload Overlay */}
          <div className="relative group shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoFileChange}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              style={{ display: 'none' }}
              aria-label="Upload Laboratory Logo"
            />

            {customLogo ? (
              <img
                src={customLogo}
                alt={profile?.name ?? 'Laboratory'}
                className="w-13 h-13 rounded-xl object-cover border border-slate-200 shadow-2xs bg-white"
              />
            ) : (
              <div className="w-13 h-13 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center text-lg font-bold select-none shadow-2xs">
                {initials}
              </div>
            )}

            {/* Logo Hover / Action Button */}
            <div className="absolute inset-0 bg-slate-900/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                title={customLogo ? 'Change Logo' : 'Upload Logo'}
                aria-label="Upload or Change Logo"
                className="p-1 rounded-md bg-white text-slate-800 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
              >
                {isUploadingLogo ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Camera size={12} />
                )}
              </button>
              {customLogo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={isUploadingLogo}
                  title="Remove Logo"
                  aria-label="Remove Custom Logo"
                  className="p-1 rounded-md bg-white text-rose-600 hover:bg-rose-50 transition-colors shadow-xs cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                {profile?.name ?? 'Diagnostic Laboratory'}
              </h2>
              <Badge tone={isPublic ? 'green' : 'neutral'}>
                {isPublic ? (
                  <>
                    <Eye size={11} className="mr-1 inline" />
                    <span>Public Directory</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={11} className="mr-1 inline" />
                    <span>Private / Unlisted</span>
                  </>
                )}
              </Badge>
              <Badge tone="blue">
                <ShieldCheck size={11} className="mr-1 inline" />
                <span>Accredited Partner</span>
              </Badge>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {fullStreetAddress || (cityStatePincode || 'Complete diagnostic center profile')}
            </div>
          </div>
        </div>

        {/* Right Status Summary Pills */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            <FlaskConical size={13} className="text-blue-600" />
            <span>Configured Tests:</span>
            <strong className="text-slate-900 font-bold ml-0.5">
              {profile?.total_services ?? 0}
            </strong>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            <Clock size={13} className="text-amber-600" />
            <span>Hours:</span>
            <span className="text-slate-800 font-medium ml-0.5">{operatingHours}</span>
          </div>
        </div>
      </div>

      {/* ── Section Navigation Tabs Matching Admin Design ── */}
      <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cx(
            'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0',
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
          )}
        >
          <Building2 size={13} />
          <span>Overview & Credentials</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={cx(
            'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0',
            activeTab === 'services'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
          )}
        >
          <FlaskConical size={13} />
          <span>Services & Catalog</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600 border border-slate-200">
            {profile?.total_services ?? services.length} Tests
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={cx(
            'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0',
            activeTab === 'schedule'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
          )}
        >
          <Calendar size={13} />
          <span>Operating Schedule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('location')}
          className={cx(
            'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0',
            activeTab === 'location'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
          )}
        >
          <Compass size={13} />
          <span>Location & Coordinates</span>
        </button>
      </div>

      {/* ── TAB 1: Overview & Credentials (3 Structured Cards) ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Card 1: General & Contact Information */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                  <Building2 size={14} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  General & Communication
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs pt-1">
                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Laboratory Name</span>
                  <span className="text-slate-900 font-semibold text-right truncate">
                    {profile?.name ?? '—'}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Contact Phone</span>
                  <span className="font-semibold text-right truncate">
                    {profile?.phone ? (
                      <a
                        href={`tel:${profile.phone}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Phone size={11} className="text-slate-400" />
                        <span>{profile.phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 italic font-normal">Not configured</span>
                    )}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Official Email</span>
                  <span className="font-semibold text-right truncate">
                    {profile?.email ? (
                      <a
                        href={`mailto:${profile.email}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Mail size={11} className="text-slate-400" />
                        <span>{profile.email}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 italic font-normal">Not configured</span>
                    )}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Directory Presence</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {isPublic ? 'Public in Doctor Referral List' : 'Direct Referrals Only'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Operating Hours & Capacity */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <div className="p-1 rounded-md bg-amber-50 text-amber-600">
                  <Clock size={14} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hours & Clinical Capacity
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs pt-1">
                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Opening Time</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {profile?.start_time ?? '—'}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Closing Time</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {profile?.end_time ?? '—'}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Schedule Summary</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {operatingHours}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Clinical Tests</span>
                  <span className="text-blue-700 font-bold text-right">
                    {profile?.total_services ?? 0} Listed Services
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Address & Coordinates */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <div className="p-1 rounded-md bg-rose-50 text-rose-600">
                  <MapPin size={14} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Physical Facility & Navigation
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs pt-1">
                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Street Address</span>
                  <span className="text-slate-900 font-semibold text-right max-w-[200px] truncate">
                    {fullStreetAddress || <span className="text-slate-400 italic font-normal">Not provided</span>}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">City & State</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {[profile?.city, profile?.state].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Postal Code</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {profile?.pincode ?? '—'}
                  </span>
                </div>

                <div className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Maps Navigation</span>
                  <span className="text-right">
                    {profile?.map_link ? (
                      <a
                        href={profile.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <span>Open Link</span>
                        <ExternalLink size={11} className="text-slate-400" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic font-normal">No link added</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Services & Test Catalog ── */}
      {activeTab === 'services' && (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FlaskConical size={15} className="text-blue-600" />
                <span>Listed Laboratory Services & Diagnostic Tests</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Diagnostic menu offered by this center for doctor referrals and patient sample collections.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigate('/client/services');
                }}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <span>Edit Services in Catalog</span>
                <ExternalLink size={11} />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tests by name, code or category…"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setServiceStatusFilter(st)}
                  className={cx(
                    'h-7 px-2.5 rounded-md text-xs font-medium border transition-colors cursor-pointer',
                    serviceStatusFilter === st
                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                  )}
                >
                  {st === 'ALL' ? 'All Status' : st === 'ACTIVE' ? 'Active Only' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>

          {/* Services List Table */}
          {servicesLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span className="text-xs text-slate-500">Loading catalog tests…</span>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
              <TestTube2 size={24} className="text-slate-300" />
              <span className="text-xs font-semibold text-slate-700">No Services Found</span>
              <p className="text-[11px] text-slate-500 max-w-xs">
                {serviceSearch
                  ? 'No diagnostic tests matched your search criteria.'
                  : 'No services are currently configured for this facility.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200/90 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-2 px-3">Service / Test Name</th>
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Sample</th>
                    <th className="py-2 px-3">Price</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredServices.map((svc) => (
                    <tr key={svc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{svc.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {svc.service_code ?? '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {svc.category ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
                            <Tag size={10} />
                            <span>{svc.category}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{svc.sample_type ?? '—'}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {svc.price !== undefined && svc.price !== null ? (
                          <span className="inline-flex items-center">
                            <IndianRupee size={11} className="mr-0.5 text-slate-400" />
                            <span>{svc.price}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <Badge tone={svc.status === 'ACTIVE' ? 'green' : 'neutral'}>
                          {svc.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingService(svc)}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                          title="View Service Details"
                          aria-label="View Service Details"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Operating Schedule ── */}
      {activeTab === 'schedule' && (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 space-y-4">
          <div className="pb-2.5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Clock size={15} className="text-amber-600" />
              <span>Facility Operating Hours & Availability</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Weekly schedule when the facility is open for sample collection, report generation, and inquiries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-100 flex items-start gap-3">
              <Clock size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-800">Standard Daily Timings</div>
                <div className="text-xs text-amber-900 font-semibold mt-0.5">
                  {operatingHours}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Patients can walk in or schedule home collection during these active operational hours.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-100 flex items-start gap-3">
              <ShieldCheck size={18} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-800">Directory Schedule Note</div>
                <div className="text-xs text-blue-900 font-semibold mt-0.5">
                  Verified Operational Slot
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  These hours are communicated on patient prescription slips and doctor recommendation views.
                </div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200/90 rounded-lg divide-y divide-slate-100 text-xs">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="py-2.5 px-3 flex items-center justify-between">
                <span className="font-semibold text-slate-800">{day}</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>{operatingHours}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: Location & Coordinates ── */}
      {activeTab === 'location' && (
        <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs p-4 space-y-4">
          <div className="pb-2.5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin size={15} className="text-rose-600" />
              <span>Physical Center Location & Navigation</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Full address details and external navigation links for physical patient visits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs space-y-2">
                <div className="font-bold text-slate-800 uppercase text-[11px] tracking-wider text-slate-400">
                  Registered Address
                </div>
                <div className="text-slate-800 font-medium leading-relaxed">
                  {fullStreetAddress || 'No street address provided.'}
                </div>
                <div className="text-slate-600">
                  {[profile?.city, profile?.state, profile?.pincode].filter(Boolean).join(', ') || '—'}
                </div>
              </div>

              {profile?.map_link ? (
                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-bold text-blue-900 block">Verified Google Maps Coordinates</span>
                    <span className="text-[11px] text-blue-700">Direct directions link active</span>
                  </div>
                  <a
                    href={profile.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-2xs"
                  >
                    <span>Open Maps</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  No Google Maps coordinates registered. Add a link in the Edit Profile drawer.
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/70 flex flex-col justify-center items-center text-center gap-2">
              <Compass size={32} className="text-slate-400" />
              <div className="text-xs font-bold text-slate-800">Quick Navigation Tips</div>
              <p className="text-[11px] text-slate-500 max-w-xs leading-normal">
                Ensuring an accurate Google Maps link allows doctor prescriptions and patient booking confirmations to include one-click directions.
              </p>
              <button
                type="button"
                onClick={openEditModal}
                className="mt-1 inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Edit3 size={12} />
                <span>Update Address</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Laboratory Profile Drawer Matching Admin LabModal Pattern ── */}
      <Modal
        open={isEditModalOpen}
        onClose={() => {
          if (!saving) setIsEditModalOpen(false);
        }}
        variant="drawer"
        size="md"
        title={
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-50 text-blue-600 inline-flex items-center justify-center">
              <Edit3 size={16} strokeWidth={2.2} />
            </div>
            <span>Edit Laboratory Profile</span>
          </div>
        }
        description="Update facility operational details, contact channels, operating schedule, and location."
      >
        <form
          onSubmit={(e) => {
            void handleSave(e);
          }}
          className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs"
        >
          {/* Section 1: General & Communication */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
              General & Communication
            </h3>

            <div>
              <label htmlFor="labNameInput" className="block text-xs font-semibold text-slate-700 mb-1">
                Laboratory Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="labNameInput"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }
                }}
                placeholder="e.g. City Central Lab"
                className={cx(
                  'w-full h-8 px-2.5 rounded-lg border bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xs',
                  fieldErrors.name
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
                )}
              />
              {fieldErrors.name && (
                <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} />
                  <span>{fieldErrors.name}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="labPhoneInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    id="labPhoneInput"
                    type="text"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) {
                        setFieldErrors((prev) => ({ ...prev, phone: '' }));
                      }
                    }}
                    placeholder="e.g. +91 98765 43210"
                    className={cx(
                      'w-full h-8 pl-8 pr-2.5 rounded-lg border bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xs',
                      fieldErrors.phone
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
                    )}
                  />
                </div>
                {fieldErrors.phone && (
                  <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} />
                    <span>{fieldErrors.phone}</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="labEmailInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    id="labEmailInput"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }
                    }}
                    placeholder="e.g. lab@example.com"
                    className={cx(
                      'w-full h-8 pl-8 pr-2.5 rounded-lg border bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xs',
                      fieldErrors.email
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
                    )}
                  />
                </div>
                {fieldErrors.email && (
                  <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} />
                    <span>{fieldErrors.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Operating Hours & Directory Presence */}
          <div className="space-y-3 pt-1">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
              Operating Hours & Directory Presence
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="labStartTimeInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  Opening Time
                </label>
                <div className="relative">
                  <Clock size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    id="labStartTimeInput"
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 07:30 AM"
                    className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="labEndTimeInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  Closing Time
                </label>
                <div className="relative">
                  <Clock size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    id="labEndTimeInput"
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="e.g. 09:30 PM"
                    className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Public Referral Visibility Toggle */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Public Referral Directory Visibility
                </span>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Display contact details on doctor referral sheets and patient receipts
                </span>
              </div>
              <button
                type="button"
                onClick={() => setContactVisibility(!contactVisibility)}
                className={cx(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  contactVisibility ? 'bg-blue-600' : 'bg-slate-300',
                )}
                role="switch"
                aria-checked={contactVisibility}
              >
                <span
                  className={cx(
                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out',
                    contactVisibility ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Physical Address & Location */}
          <div className="space-y-3 pt-1">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
              Address & Coordinates
            </h3>

            <div>
              <label htmlFor="labAddress1Input" className="block text-xs font-semibold text-slate-700 mb-1">
                Address Line 1
              </label>
              <input
                id="labAddress1Input"
                type="text"
                value={addressLine1}
                onChange={(e) => {
                  setAddressLine1(e.target.value);
                  if (fieldErrors.addressLine1) {
                    setFieldErrors((prev) => ({ ...prev, addressLine1: '' }));
                  }
                }}
                placeholder="Building / Street address"
                className={cx(
                  'w-full h-8 px-2.5 rounded-lg border bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xs',
                  fieldErrors.addressLine1
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
                )}
              />
              {fieldErrors.addressLine1 && (
                <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} />
                  <span>{fieldErrors.addressLine1}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="labAddress2Input" className="block text-xs font-semibold text-slate-700 mb-1">
                Address Line 2 (Optional)
              </label>
              <input
                id="labAddress2Input"
                type="text"
                value={addressLine2}
                onChange={(e) => {
                  setAddressLine2(e.target.value);
                  if (fieldErrors.addressLine2) {
                    setFieldErrors((prev) => ({ ...prev, addressLine2: '' }));
                  }
                }}
                placeholder="Landmark / Area"
                className={cx(
                  'w-full h-8 px-2.5 rounded-lg border bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xs',
                  fieldErrors.addressLine2
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="labCityInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  City
                </label>
                <input
                  id="labCityInput"
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (fieldErrors.city) {
                      setFieldErrors((prev) => ({ ...prev, city: '' }));
                    }
                  }}
                  placeholder="e.g. Chennai"
                  className={cx(
                    'w-full h-8 px-2.5 rounded-lg border bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xs',
                    fieldErrors.city
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
                  )}
                />
                {fieldErrors.city && (
                  <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} />
                    <span>{fieldErrors.city}</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="labStateInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  State
                </label>
                <input
                  id="labStateInput"
                  type="text"
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    if (fieldErrors.state) {
                      setFieldErrors((prev) => ({ ...prev, state: '' }));
                    }
                  }}
                  placeholder="e.g. Tamil Nadu"
                  className={cx(
                    'w-full h-8 px-2.5 rounded-lg border bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xs',
                    fieldErrors.state
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
                  )}
                />
                {fieldErrors.state && (
                  <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} />
                    <span>{fieldErrors.state}</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="labPincodeInput" className="block text-xs font-semibold text-slate-700 mb-1">
                  Pincode
                </label>
                <input
                  id="labPincodeInput"
                  type="text"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    if (fieldErrors.pincode) {
                      setFieldErrors((prev) => ({ ...prev, pincode: '' }));
                    }
                  }}
                  placeholder="e.g. 600001"
                  className={cx(
                    'w-full h-8 px-2.5 rounded-lg border bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-2xs',
                    fieldErrors.pincode
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
                  )}
                />
                {fieldErrors.pincode && (
                  <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} />
                    <span>{fieldErrors.pincode}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="labMapLinkInput" className="block text-xs font-semibold text-slate-700 mb-1">
                Google Maps Link
              </label>
              <div className="relative">
                <MapPin size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  id="labMapLinkInput"
                  type="url"
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  <span>Saving Changes…</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Service Details Drawer ── */}
      <Modal
        variant="drawer"
        size="xl"
        open={Boolean(viewingService)}
        onClose={() => setViewingService(null)}
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FlaskConical size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 leading-snug">
                {viewingService?.name ?? 'Service Details'}
              </div>
              <div className="text-[11px] text-slate-500 font-normal">
                Facility diagnostic catalog item
              </div>
            </div>
          </div>
        }
      >
        {viewingService && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {/* Header Status & Price Banner */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Standard Rate</span>
                <span className="text-lg font-bold text-slate-900 flex items-center">
                  <IndianRupee size={15} className="mr-0.5 text-slate-500" />
                  {viewingService.price !== undefined && viewingService.price !== null
                    ? Number(viewingService.price).toFixed(2)
                    : '0.00'}
                </span>
              </div>
              <Badge tone={viewingService.status === 'ACTIVE' ? 'green' : 'neutral'}>
                <span
                  className={cx(
                    'w-1.5 h-1.5 rounded-full mr-1 inline-block',
                    viewingService.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400',
                  )}
                />
                <span>{viewingService.status === 'ACTIVE' ? 'Active in Catalog' : 'Inactive'}</span>
              </Badge>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Service Code</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {viewingService.service_code ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Category</span>
                <span className="font-medium text-slate-800">
                  {viewingService.category ?? 'General'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Sample Specimen</span>
                <span className="font-medium text-slate-800">
                  {viewingService.sample_type ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Catalog ID</span>
                <span className="font-mono text-slate-600 text-[11px]">
                  {viewingService.id}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 rounded-lg border border-slate-100 bg-white">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Description & Clinical Notes</span>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {viewingService.description ?? <span className="text-slate-400 italic">No description provided for this diagnostic service.</span>}
              </p>
            </div>

            {/* Created Timestamp */}
            {viewingService.created_at && (
              <div className="text-[11px] text-slate-400 px-1">
                Added to catalog on {new Date(viewingService.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingService(null)}
                className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewingService(null);
                  void navigate('/client/services');
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <span>Manage in Services & Tests</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
