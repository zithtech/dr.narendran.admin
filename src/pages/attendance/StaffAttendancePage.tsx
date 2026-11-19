import AdminAttendancePage from './AdminAttendancePage';

export default function StaffAttendancePage() {
  return <AdminAttendancePage forcedRole="STAFF" defaultTab="check-in" />;
}
