import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Branch } from './BranchModal';
import { type Hospital } from './HospitalModal';
import { Field, Modal, Section, StatusSegment, SwitchRow } from './ui/Modal';
import { Alert } from './ui/primitives';
import { type UserAccount } from './UserModal';

export interface Patient {
  id: string;
  user_account_id: string | null;
  hospital_id: string;
  hospital_name?: string;
  branch_id: string | null;
  branch_name?: string;
  name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  height_cm?: number | null;
  weight_kg?: number | null;
  blood_group?: string | null;
  marital_status?: string | null;
  emergency_contacts?: any | null;
  profile_image_url?: string | null;
  is_active?: boolean | null;
  created_at: string;
  updated_at: string;
}

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSave: () => void;
}

export default function PatientModal({ isOpen, onClose, patient, onSave }: PatientModalProps) {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [userAccountId, setUserAccountId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [hRes, bRes, uRes] = await Promise.all([
            api.get('hospitals'),
            api.get('branches'),
            api.get('user-accounts'),
          ]);
          setHospitals(hRes.data);
          setBranches(bRes.data);
          const allUsers: UserAccount[] = uRes.data;
          setUsers(allUsers.filter((u) => u.role === 'PATIENT' && u.status === 'ACTIVE'));
        } catch (err) {
          console.error('Failed to fetch required data for patient modal', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (patient) {
      setName(patient.name);
      setHospitalId(patient.hospital_id);
      setBranchId(patient.branch_id || '');
      setUserAccountId(patient.user_account_id || '');
      setPhone(patient.phone || '');
      setEmail(patient.email || '');
      // HTML date input expects YYYY-MM-DD
      setDateOfBirth(
        patient.date_of_birth
          ? new Date(patient.date_of_birth).toISOString().split('T')[0] || ''
          : '',
      );
      setGender(patient.gender || '');
      setAddress(patient.address || '');
      setStatus(patient.status);
      setHeightCm(patient.height_cm ? patient.height_cm.toString() : '');
      setWeightKg(patient.weight_kg ? patient.weight_kg.toString() : '');
      setBloodGroup(patient.blood_group || '');
      setMaritalStatus(patient.marital_status || '');
      setEmergencyContacts(
        patient.emergency_contacts ? JSON.stringify(patient.emergency_contacts) : '',
      );
      setProfileImageUrl(patient.profile_image_url || '');
      setIsActive(
        patient.is_active !== undefined && patient.is_active !== null ? patient.is_active : true,
      );
    } else {
      setName('');
      setHospitalId('');
      setBranchId('');
      setUserAccountId('');
      setPhone('');
      setEmail('');
      setDateOfBirth('');
      setGender('');
      setAddress('');
      setStatus('ACTIVE');
      setHeightCm('');
      setWeightKg('');
      setBloodGroup('');
      setMaritalStatus('');
      setEmergencyContacts('');
      setProfileImageUrl('');
      setIsActive(true);
    }
    setError('');
  }, [patient, isOpen]);

  const availableBranches = branches.filter((b) => b.hospital_id === hospitalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hospitalId === '') {
      setError('Please select a hospital.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = patient ? `patients/${patient.id}` : `patients`;

      const method = patient ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          hospital_id: hospitalId,
          branch_id: branchId === '' ? null : branchId,
          user_account_id: userAccountId === '' ? null : userAccountId,
          name,
          phone,
          email,
          date_of_birth: dateOfBirth || null,
          gender,
          address,
          status,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          blood_group: bloodGroup || null,
          marital_status: maritalStatus || null,
          emergency_contacts: emergencyContacts ? JSON.parse(emergencyContacts) : null,
          profile_image_url: profileImageUrl || null,
          is_active: isActive,
        },
      });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save patient.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={patient ? 'Edit patient' : 'New patient'}
      description={patient ? patient.name : 'Register a patient and assign them to a hospital.'}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
      >
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          <Section title="Basic info">
            <Field label="Full name" required>
              <input
                className="ui-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. John Doe"
              />
            </Field>
            <div className="ui-grid-2">
              <Field label="Date of birth">
                <input
                  className="ui-input"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </Field>
              <Field label="Gender">
                <select
                  className="ui-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
              <Field label="Marital status">
                <select
                  className="ui-select"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </Field>
              <Field label="Profile image URL">
                <input
                  className="ui-input"
                  type="url"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  placeholder="https://…"
                />
              </Field>
            </div>
          </Section>

          <Section title="Assignment">
            <div className="ui-grid-2">
              <Field label="Hospital" required>
                <select
                  className="ui-select"
                  value={hospitalId}
                  onChange={(e) => {
                    setHospitalId(e.target.value);
                    setBranchId('');
                  }}
                  required
                >
                  <option value="" disabled>
                    Select hospital…
                  </option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Branch">
                <select
                  className="ui-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={hospitalId === ''}
                >
                  <option value="">No specific branch</option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Contact">
            <div className="ui-grid-2">
              <Field label="Email address">
                <input
                  className="ui-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Phone number">
                <input
                  className="ui-input"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <Field label="Address">
              <textarea
                className="ui-textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
              />
            </Field>
            <Field
              label="Emergency contacts"
              hint='JSON array, e.g. [{"name": "Jane Doe", "phone": "1234567890", "relation": "Spouse"}]'
            >
              <textarea
                className="ui-textarea"
                value={emergencyContacts}
                onChange={(e) => setEmergencyContacts(e.target.value)}
                placeholder='[{"name": "Jane Doe", "phone": "1234567890", "relation": "Spouse"}]'
                style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
              />
            </Field>
          </Section>

          <Section title="Health">
            <div className="ui-grid-2">
              <Field label="Height (cm)">
                <input
                  className="ui-input"
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g. 175"
                />
              </Field>
              <Field label="Weight (kg)">
                <input
                  className="ui-input"
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 70"
                />
              </Field>
              <Field label="Blood group">
                <select
                  className="ui-select"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="">Not specified</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Access">
            <div className="ui-grid-2">
              <Field label="Linked user account" hint="Only active patient logins are listed.">
                <select
                  className="ui-select"
                  value={userAccountId}
                  onChange={(e) => setUserAccountId(e.target.value)}
                >
                  <option value="">No account linked</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <StatusSegment value={status} onChange={setStatus} />
              </Field>
            </div>
            <SwitchRow
              checked={isActive}
              onChange={setIsActive}
              title="Active in system"
              description="Allow this patient to book appointments and sign in."
            />
          </Section>
        </div>

        <div className="ui-modal-foot">
          <button type="button" onClick={onClose} className="ui-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary">
            {loading ? 'Saving…' : patient ? 'Save changes' : 'Create patient'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
