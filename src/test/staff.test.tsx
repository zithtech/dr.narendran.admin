import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StaffDrawer from '../components/StaffDrawer';
import StaffModal from '../components/StaffModal';
import StaffManagement from '../pages/StaffManagement';
import type { StaffMember } from '../types/staff';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockStaffMembers: StaffMember[] = [
  {
    id: 'staff-1',
    staffCode: 'STF-001',
    name: 'Sister Mary Joseph',
    phone: '+91 9876543210',
    email: 'mary.joseph@hospital.com',
    address: '12 Health Colony, Chennai',
    role: 'Senior Nurse',
    hospitalId: 'hosp-1',
    hospitalName: 'Apollo Hospital',
    branchId: 'branch-1',
    branchName: 'Main Campus',
    shiftTiming: 'Morning',
    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    joiningDate: '2025-01-15',
    status: 'ACTIVE',
    notes: 'Head of Pediatric ICU',
    documents: [
      {
        id: 'doc-1',
        name: 'Nursing Council Registration',
        documentType: 'CERTIFICATION',
        fileName: 'nursing_license.pdf',
        fileUrl: 'https://r2.storage/staff_documents/staff-1/nursing_license.pdf',
        storageKey: 'staff_documents/staff-1/nursing_license.pdf',
        fileSize: 1024 * 500, // 500 KB
        mimeType: 'application/pdf',
        uploadedAt: '2025-01-15T10:00:00.000Z',
      },
    ],
    createdAt: '2025-01-15T09:00:00.000Z',
    created_at: '2025-01-15T09:00:00.000Z',
    updatedAt: '2025-01-15T09:00:00.000Z',
  },
  {
    id: 'staff-2',
    staffCode: 'STF-002',
    name: 'Rajesh Kumar',
    phone: '+91 9845123456',
    role: 'Lab Technician',
    hospitalId: 'hosp-1',
    hospitalName: 'Apollo Hospital',
    branchId: 'branch-2',
    branchName: 'North Wing',
    shiftTiming: 'Night',
    customShiftDetails: '22:00 - 06:00',
    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    joiningDate: '2025-03-01',
    status: 'INACTIVE',
    documents: [],
    createdAt: '2025-03-01T09:00:00.000Z',
    created_at: '2025-03-01T09:00:00.000Z',
    updatedAt: '2025-03-01T09:00:00.000Z',
  },
];

const mockHospitals = [
  { id: 'hosp-1', name: 'Apollo Hospital', status: 'ACTIVE' },
];

const mockBranches = [
  { id: 'branch-1', hospital_id: 'hosp-1', name: 'Main Campus', status: 'ACTIVE' },
  { id: 'branch-2', hospital_id: 'hosp-1', name: 'North Wing', status: 'ACTIVE' },
];

describe('Staff Management Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders staff list with staff members, roles, branch, shift timing, and documents', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('staff')) {
        return Promise.resolve({ data: mockStaffMembers });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(screen.getByText('Sister Mary Joseph')).toBeInTheDocument();
      expect(screen.getByText('Rajesh Kumar')).toBeInTheDocument();
    });

    // Check staff codes and roles
    expect(screen.getByText('STF-001')).toBeInTheDocument();
    expect(screen.getAllByText('Senior Nurse').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lab Technician').length).toBeGreaterThan(0);

    // Check shift timings
    expect(screen.getAllByText('Morning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Night').length).toBeGreaterThan(0);

    // Check document indicators
    expect(screen.getByText('1 doc')).toBeInTheDocument();
    expect(screen.getByText('No docs')).toBeInTheDocument();

    // Check status badges
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
  });

  it('opens staff details drawer with profile, documents list, and download button', async () => {
    const handleClose = vi.fn();
    const handleEdit = vi.fn();
    const handleStatusChange = vi.fn();
    const handleRefresh = vi.fn();

    renderWithProviders(
      <StaffDrawer
        staff={mockStaffMembers[0]!}
        onClose={handleClose}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onRefresh={handleRefresh}
      />
    );

    expect(screen.getByText('Staff Member Profile')).toBeInTheDocument();
    expect(screen.getByText('Sister Mary Joseph')).toBeInTheDocument();
    expect(screen.getByText('STF-001')).toBeInTheDocument();
    expect(screen.getByText('Head of Pediatric ICU')).toBeInTheDocument();

    // Check document title and download button
    expect(screen.getByText('Nursing Council Registration')).toBeInTheDocument();
    const downloadLink = screen.getByTitle('Download Document');
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink.getAttribute('href')).toContain('documents/doc-1/download');
  });

  it('allows activating and deactivating staff profiles from drawer', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { status: 'success' } });

    const handleClose = vi.fn();
    const handleEdit = vi.fn();
    const handleStatusChange = vi.fn();
    const handleRefresh = vi.fn();

    renderWithProviders(
      <StaffDrawer
        staff={mockStaffMembers[0]!} // ACTIVE
        onClose={handleClose}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onRefresh={handleRefresh}
      />
    );

    const deactivateBtn = screen.getByText('Deactivate');
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('staff/staff-1/status', { status: 'INACTIVE' });
      expect(handleStatusChange).toHaveBeenCalledWith(mockStaffMembers[0], 'INACTIVE');
    });
  });

  it('allows uploading a new document in staff drawer to R2 storage', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { status: 'success' } });

    const handleClose = vi.fn();
    const handleEdit = vi.fn();
    const handleStatusChange = vi.fn();
    const handleRefresh = vi.fn();

    renderWithProviders(
      <StaffDrawer
        staff={mockStaffMembers[0]!}
        onClose={handleClose}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onRefresh={handleRefresh}
      />
    );

    const docTitleInput = screen.getByPlaceholderText(/e\.g\. Nursing Council License/i);
    fireEvent.change(docTitleInput, { target: { value: 'BLS CPR Certification' } });

    const fileInput = screen.getByLabelText(/File \(PDF, PNG, JPG, DOCX\)/i);
    const mockFile = new File(['dummy-content'], 'bls_cert.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    const uploadBtn = screen.getByText('Upload Document');
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        'staff/staff-1/documents',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(handleRefresh).toHaveBeenCalled();
    });
  });

  it('creates a new staff member through StaffModal with role, branch, and shift timing', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('hospitals')) return Promise.resolve({ data: mockHospitals });
      if (url.includes('branches')) return Promise.resolve({ data: mockBranches });
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'new-staff-1' } } });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <StaffModal
        isOpen={true}
        staff={null}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    expect(screen.getByText('Add New Hospital Staff')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sister Mary Joseph/i), {
      target: { value: 'Anand Kumar' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. \+91 98765 43210/i), {
      target: { value: '+91 9123456780' },
    });

    // Select role
    const roleSelect = screen.getByLabelText(/Staff Role/i);
    fireEvent.change(roleSelect, { target: { value: 'Receptionist' } });

    // Select shift timing
    const shiftSelect = screen.getByLabelText(/Shift Timing/i);
    fireEvent.change(shiftSelect, { target: { value: 'Evening' } });

    // Submit form
    const submitBtn = screen.getByText('Register Staff');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('staff', expect.objectContaining({
        name: 'Anand Kumar',
        phone: '+91 9123456780',
        role: 'Receptionist',
        shiftTiming: 'Evening',
      }));
      expect(handleSave).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('allows staging multiple documents with Add Document button and uploads them on staff creation', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('hospitals')) return Promise.resolve({ data: mockHospitals });
      if (url.includes('branches')) return Promise.resolve({ data: mockBranches });
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.post).mockImplementation((url: string) => {
      if (url === 'staff') {
        return Promise.resolve({ data: { data: { id: 'new-staff-2' } } });
      }
      return Promise.resolve({ data: { status: 'success' } });
    });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <StaffModal
        isOpen={true}
        staff={null}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    // Fill basic details
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sister Mary Joseph/i), {
      target: { value: 'Priya Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. \+91 98765 43210/i), {
      target: { value: '+91 9876500000' },
    });

    const docTitleInput = screen.getByPlaceholderText(/e\.g\. Nursing Registration Certificate/i);
    const fileInput = document.getElementById('staff-document-file-input') as HTMLInputElement;

    // 1. Stage First Document
    fireEvent.change(docTitleInput, { target: { value: 'Aadhaar Card Copy' } });
    const mockFile1 = new File(['dummy-id'], 'aadhaar.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [mockFile1] } });

    const addDocBtn = screen.getByText('Add Document');
    fireEvent.click(addDocBtn);

    expect(screen.getByText('Documents to Upload (1)')).toBeInTheDocument();
    expect(screen.getByText('Aadhaar Card Copy')).toBeInTheDocument();

    // 2. Stage Second Document
    fireEvent.change(docTitleInput, { target: { value: 'Nursing Degree Certificate' } });
    const mockFile2 = new File(['dummy-cert'], 'degree.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [mockFile2] } });
    fireEvent.click(addDocBtn);

    expect(screen.getByText('Documents to Upload (2)')).toBeInTheDocument();
    expect(screen.getByText('Nursing Degree Certificate')).toBeInTheDocument();

    // 3. Register Staff
    const submitBtn = screen.getByText('Register Staff');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('staff', expect.objectContaining({
        name: 'Priya Sharma',
        phone: '+91 9876500000',
      }));
      expect(api.post).toHaveBeenCalledWith(
        'staff/new-staff-2/documents',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      // Both documents uploaded
      const documentCalls = vi.mocked(api.post).mock.calls.filter(call => call[0] === 'staff/new-staff-2/documents');
      expect(documentCalls.length).toBe(2);
      expect(handleSave).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('validates fields by type and prevents typing numbers and special characters in name', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('hospitals')) return Promise.resolve({ data: mockHospitals });
      if (url.includes('branches')) return Promise.resolve({ data: mockBranches });
      return Promise.resolve({ data: [] });
    });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <StaffModal
        isOpen={true}
        staff={null}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Sister Mary Joseph/i) as HTMLInputElement;
    const phoneInput = screen.getByPlaceholderText(/e\.g\. \+91 98765 43210/i) as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText(/e\.g\. staff@hospital\.com/i) as HTMLInputElement;

    // 1. Verify name field strips numbers and special characters
    fireEvent.change(nameInput, { target: { value: 'Sister123!@# Mary456$%^' } });
    expect(nameInput.value).toBe('Sister Mary');

    // 2. Verify phone field strips letters and disallowed symbols
    fireEvent.change(phoneInput, { target: { value: 'abc98765xyz!@#43210' } });
    expect(phoneInput.value).toBe('9876543210');

    // 3. Test empty name validation
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);
    expect(screen.getByText('Staff full name is required.')).toBeInTheDocument();

    // 4. Test phone length validation (less than 10 digits)
    fireEvent.change(phoneInput, { target: { value: '12345' } });
    fireEvent.blur(phoneInput);
    expect(screen.getByText('Phone number must contain at least 10 digits.')).toBeInTheDocument();

    // 5. Test email format validation
    fireEvent.change(emailInput, { target: { value: 'invalid-email-format' } });
    fireEvent.blur(emailInput);
    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();

    // 6. Attempt form submission with invalid fields
    const submitBtn = screen.getByText('Register Staff');
    fireEvent.click(submitBtn);

    // Should NOT call api.post and NOT save
    expect(api.post).not.toHaveBeenCalledWith('staff', expect.anything());
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('validates Custom Shift Timing Details and Document Title', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('hospitals')) return Promise.resolve({ data: mockHospitals });
      if (url.includes('branches')) return Promise.resolve({ data: mockBranches });
      return Promise.resolve({ data: [] });
    });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <StaffModal
        isOpen={true}
        staff={null}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    // 1. Switch to Custom Shift
    const customShiftCard = screen.getByRole('button', { name: /Custom Shift/i });
    fireEvent.click(customShiftCard);

    // Input should appear and be readOnly (not typeable)
    const shiftDetailsInput = screen.getByPlaceholderText(/e\.g\. 06:00 AM - 02:00 PM/i) as HTMLInputElement;
    expect(shiftDetailsInput).toBeInTheDocument();
    expect(shiftDetailsInput.readOnly).toBe(true);

    // Verify Ant Design Time Modal trigger is available and opens the modal
    const openTimeModalBtn = screen.getByRole('button', { name: /Choose in Time Modal/i });
    expect(openTimeModalBtn).toBeInTheDocument();
    fireEvent.click(openTimeModalBtn);
    expect(screen.getByText(/Choose Custom Shift Timing/i)).toBeInTheDocument();

    // Verify sanitization of invalid characters in Custom Shift Details
    fireEvent.change(shiftDetailsInput, { target: { value: '06:00 AM - 02:00 PM !@#$%' } });
    expect(shiftDetailsInput.value).toBe('06:00 AM - 02:00 PM ');

    // Test empty custom shift details validation on blur
    fireEvent.change(shiftDetailsInput, { target: { value: '' } });
    fireEvent.blur(shiftDetailsInput);
    expect(screen.getByText(/Custom shift working hours are required/i)).toBeInTheDocument();

    // 2. Test Document Title sanitization and validation
    const docTitleInput = screen.getByPlaceholderText(/e\.g\. Nursing Registration Certificate/i) as HTMLInputElement;

    // Type disallowed symbols into document title
    fireEvent.change(docTitleInput, { target: { value: 'Medical<Licence>*?:' } });
    expect(docTitleInput.value).toBe('MedicalLicence');

    // Test document title without letters (e.g. only numbers)
    fireEvent.change(docTitleInput, { target: { value: '12345' } });
    fireEvent.blur(docTitleInput);
    expect(screen.getByText(/Document title must contain at least one letter/i)).toBeInTheDocument();
  });

  it('allows selecting work days and presets in StaffModal and submits workDays in payload', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('hospitals')) return Promise.resolve({ data: mockHospitals });
      if (url.includes('branches')) return Promise.resolve({ data: mockBranches });
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'new-staff-3' } } });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <StaffModal
        isOpen={true}
        staff={null}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    // Verify Work Days header and default presets exist
    expect(screen.getByText('Work Days')).toBeInTheDocument();
    expect(screen.getByText('Mon - Fri')).toBeInTheDocument();
    expect(screen.getByText('Mon - Sat')).toBeInTheDocument();
    expect(screen.getByText('All 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Weekend')).toBeInTheDocument();

    // Fill minimum required fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sister Mary Joseph/i), {
      target: { value: 'Karthik Raja' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. \+91 98765 43210/i), {
      target: { value: '+91 9876543211' },
    });

    // Click "Mon - Sat" preset
    fireEvent.click(screen.getByText('Mon - Sat'));

    // Submit form
    const submitBtn = screen.getByText('Register Staff');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('staff', expect.objectContaining({
        name: 'Karthik Raja',
        phone: '+91 9876543211',
        workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      }));
      expect(handleSave).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('renders work days in StaffDrawer details view', async () => {
    const handleClose = vi.fn();
    const handleEdit = vi.fn();
    const handleStatusChange = vi.fn();
    const handleRefresh = vi.fn();

    renderWithProviders(
      <StaffDrawer
        staff={mockStaffMembers[0]!}
        onClose={handleClose}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onRefresh={handleRefresh}
      />
    );

    expect(screen.getByText('Work Days')).toBeInTheDocument();
    expect(screen.getByText('Mon - Fri (Weekdays)')).toBeInTheDocument();
  });

  it('opens delete confirmation modal instead of alert when deleting staff and deletes on confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('staff')) {
        return Promise.resolve({ data: mockStaffMembers });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(screen.getByText('Sister Mary Joseph')).toBeInTheDocument();
    });

    // Open row action menu for first staff member
    const actionBtns = screen.getAllByRole('button', { name: /Actions for/i });
    expect(actionBtns.length).toBeGreaterThan(0);
    fireEvent.click(actionBtns[0]!);

    // Click "Delete Staff Member"
    const deleteMenuItem = await screen.findByText('Delete Staff Member');
    fireEvent.click(deleteMenuItem);

    // Verify window.confirm was NOT called (we use a modal instead of alert)
    expect(confirmSpy).not.toHaveBeenCalled();

    // Verify modal is displayed with confirmation details
    expect(screen.getByText('Permanently remove staff record and permissions')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    // Confirm deletion inside the modal
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete Staff Member' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('staff/staff-1');
    });

    confirmSpy.mockRestore();
  });

  it('opens delete document modal instead of alert in StaffDrawer and deletes on confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const handleClose = vi.fn();
    const handleEdit = vi.fn();
    const handleStatusChange = vi.fn();
    const handleRefresh = vi.fn();

    renderWithProviders(
      <StaffDrawer
        staff={mockStaffMembers[0]!}
        onClose={handleClose}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onRefresh={handleRefresh}
      />
    );

    // Click delete document icon
    const deleteDocBtn = screen.getByTitle('Delete Document');
    fireEvent.click(deleteDocBtn);

    // Verify window.confirm was NOT called
    expect(confirmSpy).not.toHaveBeenCalled();

    // Verify document delete modal is displayed
    expect(screen.getAllByText('Delete Document').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Are you sure you want to permanently delete/i)).toBeInTheDocument();

    // Click Delete Permanently in modal
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete Permanently' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('staff/staff-1/documents/doc-1');
      expect(handleRefresh).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });
});
