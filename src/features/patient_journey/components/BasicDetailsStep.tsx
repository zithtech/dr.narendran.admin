import { App } from 'antd';
import {
  Activity,
  AlertCircle,
  Building2,
  ChevronRight,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Branch } from '../../../components/BranchModal';
import type { Hospital } from '../../../components/HospitalModal';
import type { Patient } from '../../../components/PatientModal';
import { SearchableSelect, type SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import api from '../../../utils/api';
import { getErrorMessage } from '../../../utils/errors';

const BLOOD_GROUPS: SearchableSelectOption[] = [
  { value: 'A+', label: 'A Positive (A+)' },
  { value: 'A-', label: 'A Negative (A-)' },
  { value: 'B+', label: 'B Positive (B+)' },
  { value: 'B-', label: 'B Negative (B-)' },
  { value: 'AB+', label: 'AB Positive (AB+)' },
  { value: 'AB-', label: 'AB Negative (AB-)' },
  { value: 'O+', label: 'O Positive (O+)' },
  { value: 'O-', label: 'O Negative (O-)' },
  { value: 'Unknown', label: 'Unknown / Not Tested' },
];

const GENDER_OPTIONS: SearchableSelectOption[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

interface BasicDetailsStepProps {
  initialPatient?: Patient | null;
  onSaveSuccess: (patient: Patient) => void;
  saving?: boolean;
}

export function BasicDetailsStep({
  initialPatient,
  onSaveSuccess,
}: BasicDetailsStepProps) {
  const { message } = App.useApp();

  const [name, setName] = useState(initialPatient?.name || '');
  const [hospitalId, setHospitalId] = useState(initialPatient?.hospital_id || '');
  const [branchId, setBranchId] = useState(initialPatient?.branch_id || '');
  const [phone, setPhone] = useState(initialPatient?.phone || '');
  const [email, setEmail] = useState(initialPatient?.email || '');
  const [dateOfBirth, setDateOfBirth] = useState(() => {
    if (initialPatient?.date_of_birth) {
      return new Date(initialPatient.date_of_birth).toISOString().split('T')[0] ?? '';
    }
    return '';
  });
  const [gender, setGender] = useState(initialPatient?.gender || 'Male');
  const [bloodGroup, setBloodGroup] = useState(initialPatient?.blood_group || '');
  const [occupation, setOccupation] = useState(initialPatient?.occupation || '');

  // Address
  const [addressLine1, setAddressLine1] = useState(
    initialPatient?.address_line_1 || initialPatient?.address || '',
  );
  const [city, setCity] = useState(initialPatient?.city || '');
  const [state, setState] = useState(initialPatient?.state || '');
  const [pincode, setPincode] = useState(initialPatient?.pincode || '');

  // Base Vitals
  const [heightCm, setHeightCm] = useState(initialPatient?.height_cm ? String(initialPatient.height_cm) : '');
  const [weightKg, setWeightKg] = useState(initialPatient?.weight_kg ? String(initialPatient.weight_kg) : '');
  const [bloodPressure, setBloodPressure] = useState(initialPatient?.blood_pressure || '');
  const [temperature, setTemperature] = useState(initialPatient?.body_temperature || '');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hRes, bRes] = await Promise.all([
          api.get('hospitals'),
          api.get('hospital-branches'),
        ]);
        const hList: Hospital[] = hRes.data || [];
        setHospitals(hList);
        setBranches(bRes.data || []);
        if (!hospitalId && hList.length > 0 && hList[0]) {
          setHospitalId(hList[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch hospitals/branches', err);
      }
    };
    void fetchData();
  }, [hospitalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Patient Full Name is required.');
      return;
    }
    if (!hospitalId) {
      setError('Please select an affiliated Hospital.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        hospital_id: hospitalId,
        branch_id: branchId || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        date_of_birth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        gender: gender || null,
        blood_group: bloodGroup || null,
        occupation: occupation.trim() || null,
        address_line_1: addressLine1.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        blood_pressure: bloodPressure.trim() || null,
        body_temperature: temperature.trim() || null,
      };

      if (emergencyName.trim() || emergencyPhone.trim()) {
        payload.emergency_contacts = [
          {
            name: emergencyName.trim(),
            phone: emergencyPhone.trim(),
            relation: emergencyRelation.trim(),
          },
        ];
      }

      let res;
      if (initialPatient?.id) {
        res = await api.put<Patient>(`patients/${initialPatient.id}`, payload);
      } else {
        res = await api.post<Patient>('patients', payload);
      }

      message.success(initialPatient ? 'Patient details updated!' : 'Patient registered successfully!');
      onSaveSuccess(res.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save patient. Please check required fields.'));
    } finally {
      setLoading(false);
    }
  };

  const hospitalOptions: SearchableSelectOption[] = hospitals.map((h) => ({
    value: h.id,
    label: h.name,
  }));

  const branchOptions: SearchableSelectOption[] = branches
    .filter((b) => !hospitalId || b.hospital_id === hospitalId)
    .map((b) => ({
      value: b.id,
      label: b.name,
    }));

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px 24px', width: '100%', boxSizing: 'border-box' }}>
      {/* ── Header Banner ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid #bfdbfe',
            }}
          >
            <User size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
              Phase 1 · Patient Identity & Demographics
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              Collect personal contact details, residential address, base physical vitals, and hospital affiliation.
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            color: '#b91c1c',
            fontSize: 12.5,
            marginBottom: 16,
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── Section A: Identity & Contact ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <User size={14} />
            </div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Personal Information & Contacts
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Patient Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="patient-form-input"
                placeholder="e.g. Meenakshi Sundaram"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Contact Phone Number
              </label>
              <input
                type="tel"
                className="patient-form-input"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                className="patient-form-input"
                placeholder="e.g. patient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Gender <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <SearchableSelect
                options={GENDER_OPTIONS}
                value={gender}
                onChange={(val) => setGender(val)}
                searchable={false}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Date of Birth
              </label>
              <input
                type="date"
                className="patient-form-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Blood Group
              </label>
              <SearchableSelect
                options={BLOOD_GROUPS}
                value={bloodGroup}
                onChange={(val) => setBloodGroup(val)}
                placeholder="Select blood group..."
                searchable={false}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Occupation
              </label>
              <input
                type="text"
                className="patient-form-input"
                placeholder="e.g. Teacher, Engineer, Homemaker"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 12, fontWeight: 650, color: '#475569', marginBottom: 8 }}>
              Emergency Contact Person (Optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 12 }}>
              <div>
                <input
                  type="text"
                  className="patient-form-input"
                  placeholder="Emergency contact name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  style={{ height: 38, fontSize: 13 }}
                />
              </div>
              <div>
                <input
                  type="tel"
                  className="patient-form-input"
                  placeholder="Emergency phone number"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  style={{ height: 38, fontSize: 13 }}
                />
              </div>
              <div>
                <input
                  type="text"
                  className="patient-form-input"
                  placeholder="Relationship (e.g. Spouse)"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  style={{ height: 38, fontSize: 13 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section B: Hospital & Residential Address ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: '#f0fdf4',
                color: '#16a34a',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Building2 size={14} />
            </div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Hospital Assignment & Complete Address
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Primary Hospital <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <SearchableSelect
                options={hospitalOptions}
                value={hospitalId}
                onChange={(val) => setHospitalId(val)}
                placeholder="Select hospital..."
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Hospital Branch
              </label>
              <SearchableSelect
                options={branchOptions}
                value={branchId}
                onChange={(val) => setBranchId(val)}
                placeholder="Select branch (optional)..."
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Address Line 1 / Street
              </label>
              <input
                type="text"
                className="patient-form-input"
                placeholder="e.g. 42 Gandhi Road, Anna Nagar"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                City
              </label>
              <input
                type="text"
                className="patient-form-input"
                placeholder="e.g. Chennai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                State
              </label>
              <input
                type="text"
                className="patient-form-input"
                placeholder="e.g. Tamil Nadu"
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Pincode
              </label>
              <input
                type="text"
                className="patient-form-input"
                placeholder="e.g. 600001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        {/* ── Section C: Baseline Vitals ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: '#fff7ed',
                color: '#ea580c',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Activity size={14} />
            </div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Base Physical Vitals (Optional)
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Height (cm)
              </label>
              <input
                type="number"
                step="0.1"
                className="patient-form-input"
                placeholder="e.g. 165"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                className="patient-form-input"
                placeholder="e.g. 62"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Blood Pressure
              </label>
              <input
                type="text"
                className="patient-form-input"
                placeholder="e.g. 120/80"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Temperature (°F)
              </label>
              <input
                type="text"
                className="patient-form-input"
                placeholder="e.g. 98.4"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                style={{ height: 38, fontSize: 13 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Navigation ── */}
      <div
        className="patient-drawer-footer"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <button
          type="submit"
          disabled={loading}
          className="patient-footer-btn patient-footer-btn-primary"
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
          }}
        >
          <span>{loading ? 'Saving Patient…' : 'Save & Next: Past Medical History'}</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </form>
  );
}

export default BasicDetailsStep;
