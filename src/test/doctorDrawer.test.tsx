import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import DoctorDrawer from '../components/DoctorDrawer';
import { type Doctor } from '../components/DoctorModal';

vi.mock('../context/PermissionContext', () => ({
  usePermission: () => ({
    canView: () => true,
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
    hasRole: () => true,
    refreshPermissions: async () => {},
  }),
}));

const mockDoctor: Doctor = {
  id: 'doc-101',
  user_account_id: 'usr-1',
  hospital_id: 'hosp-1',
  hospital_name: 'Apollo Speciality Hospital',
  branch_id: 'br-1',
  branch_name: 'Greams Road Branch',
  name: 'Dr. Narendran V',
  phone: '+91 98765 43210',
  email: 'narendran@apollo.org',
  specialization: 'Senior Cardiologist',
  status: 'ACTIVE',
  qualification: 'MBBS, MD, DM (Cardio)',
  medical_registration_number: 'TN-MED-49102',
  address_line_1: '21 Greams Lane, Thousand Lights',
  address_line_2: 'Suite 402, Cardio Wing',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600006',
  years_of_experience: 16,
  podcast_url: 'https://youtube.com/@drnarendran_cardio',
  is_active: true,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-06-20T14:30:00Z',
};

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
};

describe('Enhanced DoctorDrawer UI', () => {
  it('renders modern hero with avatar, name, badges, and quick actions', () => {
    const handleClose = vi.fn();
    const handleEdit = vi.fn();
    const handleSchedule = vi.fn();

    renderWithContext(
      <DoctorDrawer
        doctor={mockDoctor}
        onClose={handleClose}
        onEdit={handleEdit}
        onSchedule={handleSchedule}
        scheduleVersion={1}
      />
    );

    // Doctor name and qualification
    expect(screen.getByText('Dr. Narendran V')).toBeInTheDocument();
    expect(screen.getAllByText('MBBS, MD, DM (Cardio)').length).toBeGreaterThanOrEqual(1);

    // Specialization and status badges
    expect(screen.getAllByText('Senior Cardiologist').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Active Doctor')).toBeInTheDocument();

    // Top quick action buttons in hero
    const scheduleBtns = screen.getAllByRole('button', { name: /schedule/i });
    expect(scheduleBtns.length).toBeGreaterThanOrEqual(1);

    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    expect(editBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders clinical patient and appointment metrics with App Account linkage', () => {
    renderWithContext(
      <DoctorDrawer
        doctor={mockDoctor}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onSchedule={vi.fn()}
        scheduleVersion={1}
      />
    );

    // All 7 top counts on the left side of the top split
    expect(screen.getByText('Total Patients')).toBeInTheDocument();
    expect(screen.getByText("Today's Patients")).toBeInTheDocument();
    expect(screen.getByText('Total Appointments')).toBeInTheDocument();
    expect(screen.getByText('Completed Appointments')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
    expect(screen.getByText('Cancelled Appointments')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Patients')).toBeInTheDocument();
    expect(screen.getByText(/account linked/i)).toBeInTheDocument();
  });

  it('renders all 6 structured cards with credentials, address, and channels', () => {
    renderWithContext(
      <DoctorDrawer
        doctor={mockDoctor}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onSchedule={vi.fn()}
        scheduleVersion={1}
      />
    );

    // Card 1: Professional & Clinical Credentials
    expect(screen.getByText('Professional & Clinical Credentials')).toBeInTheDocument();
    expect(screen.getByText('TN-MED-49102')).toBeInTheDocument();
    expect(screen.getByText('16 Years in Practice')).toBeInTheDocument();

    // Card 2: Hospital & Clinic Assignment
    expect(screen.getByText('Hospital & Clinic Assignment')).toBeInTheDocument();
    expect(screen.getByText('Apollo Speciality Hospital')).toBeInTheDocument();
    expect(screen.getByText('Greams Road Branch')).toBeInTheDocument();
    expect(screen.getAllByText(/21 Greams Lane, Thousand Lights/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Chennai, Tamil Nadu, 600006/i).length).toBeGreaterThanOrEqual(1);

    // Left Profile Contact Links (Support & Call Me)
    expect(screen.getByText(/narendran@apollo\.org/i)).toBeInTheDocument();
    expect(screen.getByText(/\+91 98765 43210/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /narendran@apollo\.org/i })).toHaveAttribute('href', 'mailto:narendran@apollo.org');
    expect(screen.getByRole('link', { name: /\+91 98765 43210/i })).toHaveAttribute('href', 'tel:+91 98765 43210');

    // Card 4: Weekly Schedule & Consultation Availability
    expect(screen.getByText(/Weekly Schedule & Consultation Availability/i)).toBeInTheDocument();

    // Card 5: Media & External Channels
    expect(screen.getByText('Media & External Channels')).toBeInTheDocument();
    expect(screen.getByText('https://youtube.com/@drnarendran_cardio')).toBeInTheDocument();

    // Card 6: System Record & Access Control
    expect(screen.getByText('System Record & Access Control')).toBeInTheDocument();
    expect(screen.getByText('Linked Portal Account')).toBeInTheDocument();
  });

  it('triggers onEdit, onSchedule, and onClose callbacks from footer buttons', () => {
    const handleClose = vi.fn();
    const handleEdit = vi.fn();
    const handleSchedule = vi.fn();

    renderWithContext(
      <DoctorDrawer
        doctor={mockDoctor}
        onClose={handleClose}
        onEdit={handleEdit}
        onSchedule={handleSchedule}
        scheduleVersion={1}
      />
    );

    // Click Close
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Click Edit Doctor Details in footer
    const editDetailBtn = screen.getByRole('button', { name: /edit doctor details/i });
    fireEvent.click(editDetailBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockDoctor);

    // Click Manage Schedule in footer
    const manageScheduleBtns = screen.getAllByRole('button', { name: /manage schedule/i });
    expect(manageScheduleBtns.length).toBeGreaterThan(0);
    fireEvent.click(manageScheduleBtns[manageScheduleBtns.length - 1]!);
    expect(handleSchedule).toHaveBeenCalledWith(mockDoctor);
  });

  it('safely renders incomplete or minimal doctor records without throwing or blanking', () => {
    const minimalDoctor = {
      id: 'doc-minimal',
      name: '',
      status: 'ACTIVE' as const,
    } as Doctor;

    expect(() => {
      renderWithContext(
        <DoctorDrawer
          doctor={minimalDoctor}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onSchedule={vi.fn()}
          scheduleVersion={1}
        />
      );
    }).not.toThrow();

    expect(screen.getByText('Doctor Profile & Clinical Credentials')).toBeInTheDocument();
  });

  it('uses femaleimg for female doctor without profile image', () => {
    const femaleDoctor: Doctor = {
      ...mockDoctor,
      id: 'doc-female',
      name: 'Dr. Kavitha Ramachandran',
      gender: 'FEMALE',
      profile_image_url: null,
    };

    renderWithContext(
      <DoctorDrawer
        doctor={femaleDoctor}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onSchedule={vi.fn()}
        scheduleVersion={1}
      />
    );

    const img = screen.getByRole('img', { name: /dr\. kavitha ramachandran/i });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toMatch(/femaleimg/i);
  });

  it('uses maleimg for male doctor without profile image', () => {
    const maleDoctor: Doctor = {
      ...mockDoctor,
      id: 'doc-male',
      name: 'Dr. Narendran V',
      gender: 'MALE',
      profile_image_url: null,
    };

    renderWithContext(
      <DoctorDrawer
        doctor={maleDoctor}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onSchedule={vi.fn()}
        scheduleVersion={1}
      />
    );

    const img = screen.getByRole('img', { name: /dr\. narendran v/i });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toMatch(/maleimg/i);
  });

  it('falls back to default avatar image when doctor profile_image_url errors', () => {
    const doctorWithBrokenImage: Doctor = {
      ...mockDoctor,
      id: 'doc-broken',
      name: 'Dr. Ramesh',
      profile_image_url: 'https://example.com/broken-photo.jpg',
    };

    renderWithContext(
      <DoctorDrawer
        doctor={doctorWithBrokenImage}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onSchedule={vi.fn()}
        scheduleVersion={1}
      />
    );

    const img = screen.getByRole('img', { name: /dr\. ramesh/i });
    expect(img).toHaveAttribute('src', 'https://example.com/broken-photo.jpg');

    // Trigger image error
    fireEvent.error(img);

    // Should switch to maleimg fallback
    expect(img.getAttribute('src')).toMatch(/maleimg/i);
  });

  it('safely transitions from closed (null) to open without hook mismatch errors', () => {
    const { rerender } = renderWithContext(
      <DoctorDrawer
        doctor={null}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onSchedule={vi.fn()}
        scheduleVersion={1}
      />
    );

    // Re-render when a doctor is selected to open the drawer
    expect(() => {
      rerender(
        <MemoryRouter>
          <DoctorDrawer
            doctor={mockDoctor}
            onClose={vi.fn()}
            onEdit={vi.fn()}
            onSchedule={vi.fn()}
            scheduleVersion={1}
          />
        </MemoryRouter>
      );
    }).not.toThrow();

    expect(screen.getByText('Dr. Narendran V')).toBeInTheDocument();
  });
});
