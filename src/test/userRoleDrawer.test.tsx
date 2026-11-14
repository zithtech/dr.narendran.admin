import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RoleModal, { type Role } from '../components/RoleModal';
import UserModal, { type UserAccount } from '../components/UserModal';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => {
  const fn = vi.fn();
  (fn as any).get = vi.fn();
  (fn as any).post = vi.fn();
  (fn as any).put = vi.fn();
  (fn as any).delete = vi.fn();
  return { default: fn };
});

const mockUser: UserAccount = {
  id: 'usr-001',
  username: 'drsmith_cardio',
  role: 'DOCTOR',
  status: 'ACTIVE',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

const mockModules = [
  { slug: 'APPOINTMENTS', name: 'Appointments', description: 'Patient booking and schedule' },
  { slug: 'PHARMACY', name: 'Pharmacy', description: 'Medicine inventory and dispensing' },
  { slug: 'LABS', name: 'Labs', description: 'Diagnostic test referrals' },
];

const mockRole: Role = {
  id: 'role-001',
  name: 'Lab Technician',
  description: 'Conducts laboratory tests and logs results',
  is_system_role: false,
  permissions: [
    { module_slug: 'LABS', can_read: true, can_write: true, can_delete: false },
    { module_slug: 'APPOINTMENTS', can_read: true, can_write: false, can_delete: false },
  ],
};

describe('User Accounts & Roles & Permissions Drawers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: mockModules });
  });

  describe('UserModal (User Accounts Drawer)', () => {
    it('renders create drawer with credentials, role selector cards, and status cards', () => {
      renderWithProviders(
        <UserModal isOpen={true} onClose={vi.fn()} userAccount={null} onSave={vi.fn()} />,
      );

      expect(screen.getAllByText('Create User Account').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/Register sign-in credentials and assign system access permissions/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter a strong secret passphrase/i)).toBeInTheDocument();
      expect(screen.getByText(/Authentication Credentials/i)).toBeInTheDocument();
      expect(screen.getByText(/Role & Permission Scope/i)).toBeInTheDocument();
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('Doctor / Clinician')).toBeInTheDocument();
      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByText('Active Account')).toBeInTheDocument();
      expect(screen.getByText('Inactive / Suspended')).toBeInTheDocument();
    });

    it('renders edit drawer with populated username and role, and saves changes', async () => {
      vi.mocked(api).mockResolvedValue({ data: { success: true } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <UserModal
          isOpen={true}
          onClose={handleClose}
          userAccount={mockUser}
          onSave={handleSave}
        />,
      );

      expect(screen.getByText('Edit User Account')).toBeInTheDocument();
      expect(screen.getByDisplayValue('drsmith_cardio')).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PUT',
            url: 'user-accounts/usr-001',
            data: expect.objectContaining({
              username: 'drsmith_cardio',
              role: 'DOCTOR',
              status: 'ACTIVE',
            }),
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it('creates a new user account with role selection', async () => {
      vi.mocked(api).mockResolvedValue({ data: { id: 'new-user', success: true } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <UserModal isOpen={true} onClose={handleClose} userAccount={null} onSave={handleSave} />,
      );

      const usernameInput = screen.getByLabelText(/Username/i);
      fireEvent.change(usernameInput, { target: { value: 'reception_front' } });

      const passwordInput = screen.getByPlaceholderText(/Enter a strong secret passphrase/i);
      fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });

      // Click Administrator role
      const adminRoleBtn = screen.getByText('Administrator');
      fireEvent.click(adminRoleBtn);

      const submitBtn = screen.getByRole('button', { name: /Create User Account/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            url: 'user-accounts',
            data: expect.objectContaining({
              username: 'reception_front',
              password: 'Secret123!',
              role: 'ADMIN',
              status: 'ACTIVE',
            }),
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it('validates that username and password are required on create', async () => {
      renderWithProviders(
        <UserModal isOpen={true} onClose={vi.fn()} userAccount={null} onSave={vi.fn()} />,
      );

      const submitBtn = screen.getByRole('button', { name: /Create User Account/i });
      fireEvent.submit(submitBtn.closest('form')!);

      expect(screen.getByText(/Username is required/i)).toBeInTheDocument();
    });

    it('renders forgot password option and allows generating a secure password or resetting to default', async () => {
      renderWithProviders(
        <UserModal
          isOpen={true}
          onClose={vi.fn()}
          userAccount={mockUser}
          onSave={vi.fn()}
        />,
      );

      // Verify "Forgot password?" is present in both header and helper positions
      const forgotBtns = screen.getAllByRole('button', { name: /Forgot password\?/i });
      expect(forgotBtns.length).toBeGreaterThanOrEqual(1);

      // Click "Forgot password?" to expand helper panel
      fireEvent.click(forgotBtns[0]!);

      expect(screen.getByText(/Forgot Password & Reset Helper/i)).toBeInTheDocument();
      expect(screen.getByText(/Manage credentials & recovery for @drsmith_cardio/i)).toBeInTheDocument();

      // Click "Generate Random"
      const generateBtn = screen.getByRole('button', { name: /Generate Random/i });
      fireEvent.click(generateBtn);

      expect(screen.getByText(/Secure password generated and applied/i)).toBeInTheDocument();

      // Click "Set Welcome@123"
      const defaultBtn = screen.getByRole('button', { name: /Set Welcome@123/i });
      fireEvent.click(defaultBtn);

      expect(screen.getByText(/Temporary default password applied \(Welcome@123\)/i)).toBeInTheDocument();
    });
  });

  describe('RoleModal (Roles & Permissions Drawer)', () => {
    it('renders create drawer with role identity, permission matrix, and quick select buttons', async () => {
      renderWithProviders(
        <RoleModal isOpen={true} onClose={vi.fn()} role={null} onSave={vi.fn()} />,
      );

      expect(screen.getAllByText('Create Role & Permissions').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(
          /Define a custom staff role and configure create, read, update, delete, and manage permissions/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Role Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Role Identity/i)).toBeInTheDocument();
      expect(screen.getByText(/Module Permission Matrix/i)).toBeInTheDocument();
      expect(screen.getByText('All Read')).toBeInTheDocument();
      expect(screen.getByText('Full Access')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Appointments')).toBeInTheDocument();
        expect(screen.getByText('Pharmacy')).toBeInTheDocument();
        expect(screen.getByText('Labs')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Create permission for Appointments')).toBeInTheDocument();
      expect(screen.getByLabelText('Read permission for Appointments')).toBeInTheDocument();
      expect(screen.getByLabelText('Update permission for Appointments')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete permission for Appointments')).toBeInTheDocument();
      expect(screen.getByLabelText('Manage permission for Appointments')).toBeInTheDocument();
      expect(screen.getAllByText('0 / 5').length).toBe(3);
    });

    it('allows toggling permissions and batch actions in RoleModal', async () => {
      renderWithProviders(
        <RoleModal isOpen={true} onClose={vi.fn()} role={null} onSave={vi.fn()} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Appointments')).toBeInTheDocument();
      });

      // Toggling Manage grants all 5 options for that module
      const manageCheckbox = screen.getByLabelText('Manage permission for Appointments');
      fireEvent.click(manageCheckbox);
      expect(screen.getByText(/5 active grants/i)).toBeInTheDocument();
      expect(screen.getByText('5 / 5')).toBeInTheDocument();

      // Unchecking Update automatically clears Manage leaving Create, Read, Delete (3 / 5)
      const updateCheckbox = screen.getByLabelText('Update permission for Appointments');
      fireEvent.click(updateCheckbox);
      expect(screen.getByText(/3 active grants/i)).toBeInTheDocument();
      expect(screen.getByText('3 / 5')).toBeInTheDocument();
      expect(manageCheckbox).not.toBeChecked();

      // Click Full Access batch button (3 modules * 5 options = 15 active grants)
      const fullAccessBtn = screen.getByText('Full Access');
      fireEvent.click(fullAccessBtn);

      expect(screen.getByText(/15 active grants/i)).toBeInTheDocument();

      // Click Reset batch button
      const resetBtn = screen.getByText('Reset');
      fireEvent.click(resetBtn);

      expect(screen.getByText(/0 active grants/i)).toBeInTheDocument();
    });

    it('creates a new role with assigned permissions', async () => {
      vi.mocked(api).mockResolvedValue({ data: { success: true } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <RoleModal isOpen={true} onClose={handleClose} role={null} onSave={handleSave} />,
      );

      const nameInput = screen.getByLabelText(/Role Name/i);
      fireEvent.change(nameInput, { target: { value: 'Pharmacist Manager' } });

      const allReadBtn = screen.getByText('All Read');
      fireEvent.click(allReadBtn);

      const submitBtn = screen.getByRole('button', { name: /Create Role/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            url: 'rbac/roles',
            data: expect.objectContaining({
              name: 'Pharmacist Manager',
            }),
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it('renders edit role drawer with pre-filled role details', async () => {
      vi.mocked(api).mockResolvedValue({ data: { success: true } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <RoleModal isOpen={true} onClose={handleClose} role={mockRole} onSave={handleSave} />,
      );

      expect(screen.getByText('Edit Role & Permissions')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Lab Technician')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Conducts laboratory tests and logs results'),
      ).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PUT',
            url: 'rbac/roles/Lab%20Technician',
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
