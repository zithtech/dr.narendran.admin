import { Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { DoctorLocationCardsView } from '../components/DoctorLocationCardsView';
import { DoctorLocationsTable } from '../components/DoctorLocationsTable';
import { locationsApi } from '../services/locationsApi';
import type { DoctorSummaryWithLocations } from '../types/locations';

export function LocationManagementPage() {
  const { doctorId } = useParams<{ doctorId?: string }>();
  const [role, setRole] = useState<string>('');
  const [currentDoctorProfile, setCurrentDoctorProfile] = useState<DoctorSummaryWithLocations | null>(null);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<DoctorSummaryWithLocations | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedRole = (localStorage.getItem('adminRole') || '').toUpperCase();
    setRole(storedRole);

    const init = async () => {
      try {
        setLoading(true);
        if (storedRole === 'DOCTOR') {
          // Doctor login: fetch current doctor profile
          const profile = await locationsApi.getCurrentDoctorProfile();
          setCurrentDoctorProfile(profile);
        } else if (doctorId) {
          // Admin login looking at a specific doctor's locations
          const doctors = await locationsApi.getDoctors();
          const target = doctors.find((d) => d.id === doctorId);
          setSelectedDoctorProfile(target || null);
        }
      } catch {
        // Handled silently
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spin size="large" tip="Loading locations..." />
      </div>
    );
  }

  const isDoctorRole = role === 'DOCTOR';

  // Doctor role always lands directly on their own practice locations view
  if (isDoctorRole) {
    return (
      <DoctorLocationCardsView
        isDoctorRole={true}
        doctorProfile={currentDoctorProfile}
      />
    );
  }

  // Admin role with specific doctor selected
  if (doctorId) {
    return (
      <DoctorLocationCardsView
        doctorId={doctorId}
        doctorProfile={selectedDoctorProfile}
        isDoctorRole={false}
      />
    );
  }

  // Admin role listing all doctors
  return <DoctorLocationsTable />;
}

export default LocationManagementPage;

