import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Branch } from './BranchModal';
import { type Hospital } from './HospitalModal';
import { Field, Modal, Section, StatusSegment, SwitchRow } from './ui/Modal';
import { Alert, Avatar } from './ui/primitives';
import { type UserAccount } from './UserModal';

export interface Doctor {
  id: string;
  user_account_id: string | null;
  hospital_id: string;
  hospital_name?: string;
  branch_id: string | null;
  branch_name?: string;
  name: string;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  qualification?: string | null;
  medical_registration_number?: string | null;
  clinic_address?: string | null;
  years_of_experience?: number | null;
  profile_image_url?: string | null;
  podcast_url?: string | null;
  is_active?: boolean | null;
  created_at: string;
  updated_at: string;
}

interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  onSave: () => void;
}

export default function DoctorModal({ isOpen, onClose, doctor, onSave }: DoctorModalProps) {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [userAccountId, setUserAccountId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [qualification, setQualification] = useState('');
  const [medicalRegistrationNumber, setMedicalRegistrationNumber] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState<string>('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [podcastUrl, setPodcastUrl] = useState('');
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
          setUsers(allUsers.filter((u) => u.role === 'DOCTOR' && u.status === 'ACTIVE'));
        } catch (err) {
          console.error('Failed to fetch required data for doctor modal', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (doctor) {
      setName(doctor.name);
      setHospitalId(doctor.hospital_id);
      setBranchId(doctor.branch_id || '');
      setUserAccountId(doctor.user_account_id || '');
      setPhone(doctor.phone || '');
      setEmail(doctor.email || '');
      setSpecialization(doctor.specialization || '');
      setStatus(doctor.status);
      setQualification(doctor.qualification || '');
      setMedicalRegistrationNumber(doctor.medical_registration_number || '');
      setClinicAddress(doctor.clinic_address || '');
      setYearsOfExperience(doctor.years_of_experience ? doctor.years_of_experience.toString() : '');
      setProfileImageUrl(doctor.profile_image_url || '');
      setPodcastUrl(doctor.podcast_url || '');
      setIsActive(
        doctor.is_active !== undefined && doctor.is_active !== null ? doctor.is_active : true,
      );
    } else {
      setName('');
      setHospitalId('');
      setBranchId('');
      setUserAccountId('');
      setPhone('');
      setEmail('');
      setSpecialization('');
      setStatus('ACTIVE');
      setQualification('');
      setMedicalRegistrationNumber('');
      setClinicAddress('');
      setYearsOfExperience('');
      setProfileImageUrl('');
      setPodcastUrl('');
      setIsActive(true);
    }
    setError('');
  }, [doctor, isOpen]);

  // Filter branches by selected hospital
  const availableBranches = branches.filter((b) => b.hospital_id === hospitalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter doctor name.');
      return;
    }
    if (hospitalId === '') {
      setError('Please select a hospital.');
      return;
    }
    setLoading(true);
    setError('');

    const normalizeUrl = (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) return null;
      if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
        return `https://${trimmed}`;
      }
      return trimmed;
    };

    try {
      const url = doctor ? `doctors/${doctor.id}` : `doctors`;

      const method = doctor ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          hospital_id: hospitalId,
          branch_id: branchId === '' ? null : branchId,
          user_account_id: userAccountId === '' ? null : userAccountId,
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          specialization: specialization.trim() || null,
          status,
          qualification: qualification.trim() || null,
          medical_registration_number: medicalRegistrationNumber.trim() || null,
          clinic_address: clinicAddress.trim() || null,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : null,
          profile_image_url: normalizeUrl(profileImageUrl),
          podcast_url: normalizeUrl(podcastUrl),
          is_active: isActive,
        },
      });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save doctor.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={doctor ? 'Edit doctor' : 'New doctor'}
      description={doctor ? doctor.name : 'Add a doctor and assign them to a hospital.'}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
        noValidate
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
                placeholder="e.g. Dr. Jane Smith"
              />
            </Field>
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
            <Field label="Profile image URL">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar name={name || 'Doctor'} src={profileImageUrl} size={40} />
                <input
                  className="ui-input"
                  style={{ flex: 1 }}
                  type="text"
                  inputMode="url"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  onBlur={() => {
                    const trimmed = profileImageUrl.trim();
                    if (trimmed && !/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
                      setProfileImageUrl(`https://${trimmed}`);
                    }
                  }}
                  placeholder="https://… (Direct or external image URL)"
                />
              </div>
            </Field>
            <Field label="Podcast / YouTube Channel Link" hint="Link to doctor's podcast, YouTube channel, or video stream.">
              <input
                className="ui-input"
                type="text"
                inputMode="url"
                value={podcastUrl}
                onChange={(e) => setPodcastUrl(e.target.value)}
                onBlur={() => {
                  const trimmed = podcastUrl.trim();
                  if (trimmed && !/^https?:\/\//i.test(trimmed)) {
                    setPodcastUrl(`https://${trimmed}`);
                  }
                }}
                placeholder="e.g. https://youtube.com/@doctorchannel or www.youtube.com/..."
              />
            </Field>
          </Section>

          <Section title="Assignment">
            <div className="ui-grid-2">
              <Field label="Hospital" required>
                <select
                  className="ui-select"
                  value={hospitalId}
                  onChange={(e) => {
                    setHospitalId(e.target.value);
                    setBranchId(''); // Reset branch when hospital changes
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
            <Field label="Clinic address">
              <textarea
                className="ui-textarea"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                placeholder="e.g. 123 Health Ave, Suite 100"
              />
            </Field>
          </Section>

          <Section title="Professional">
            <div className="ui-grid-2">
              <Field label="Specialization">
                <input
                  className="ui-input"
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cardiologist"
                />
              </Field>
              <Field label="Qualification">
                <input
                  className="ui-input"
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. MBBS, MD"
                />
              </Field>
              <Field label="Medical registration no.">
                <input
                  className="ui-input"
                  type="text"
                  value={medicalRegistrationNumber}
                  onChange={(e) => setMedicalRegistrationNumber(e.target.value)}
                  placeholder="e.g. MED-12345"
                />
              </Field>
              <Field label="Years of experience">
                <input
                  className="ui-input"
                  type="number"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  placeholder="e.g. 10"
                  min="0"
                  max="100"
                />
              </Field>
            </div>
          </Section>

          <Section title="Access">
            <div className="ui-grid-2">
              <Field label="Linked user account" hint="Only active doctor logins are listed.">
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
              description="Allow this doctor to appear in booking and scheduling."
            />
          </Section>
        </div>

        <div className="ui-modal-foot">
          <button type="button" onClick={onClose} className="ui-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary">
            {loading ? 'Saving…' : doctor ? 'Save changes' : 'Create doctor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
