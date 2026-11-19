import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Spin } from 'antd';
import PatientModal, { type Patient, type PatientModalStep } from '../components/PatientModal';
import api from '../utils/api';

export default function PatientFormPage() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId?: string }>();
  const [searchParams] = useSearchParams();
  const stepParam = searchParams.get('step') as PatientModalStep | null;

  const isEditing = Boolean(patientId && patientId !== 'new');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && patientId) {
      let isCancelled = false;
      setLoading(true);
      setError(null);
      api
        .get(`patients/${patientId}`)
        .then((res) => {
          if (!isCancelled) {
            setPatient(res.data);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setError(err?.response?.data?.message || err?.message || 'Failed to load patient');
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setLoading(false);
          }
        });

      return () => {
        isCancelled = true;
      };
    } else {
      setPatient(null);
      setLoading(false);
    }
  }, [patientId, isEditing]);

  const handleReturn = () => {
    if (isEditing && patientId) {
      navigate(`/patients/${patientId}`);
    } else {
      navigate('/patients');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '65vh',
          gap: 16,
        }}
      >
        <Spin size="large" />
        <div style={{ color: '#64748b', fontSize: 14 }}>Loading patient information…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          maxWidth: 480,
          margin: '40px auto',
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #fee2e2',
        }}
      >
        <div style={{ color: '#ef4444', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Unable to Load Patient
        </div>
        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{error}</div>
        <button type="button" className="ui-btn ui-btn-primary" onClick={() => navigate('/patients')}>
          Return to Patients
        </button>
      </div>
    );
  }

  return (
    <PatientModal
      isOpen={true}
      isPage={true}
      patient={patient}
      initialStep={stepParam || undefined}
      onClose={handleReturn}
      onSave={handleReturn}
    />
  );
}
