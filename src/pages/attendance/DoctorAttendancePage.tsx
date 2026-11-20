import AdminAttendancePage from './AdminAttendancePage';

export default function DoctorAttendancePage() {
  return <AdminAttendancePage forcedRole="DOCTOR" defaultTab="check-in" />;
}
