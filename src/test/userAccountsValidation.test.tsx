import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import UserModal, {
  validateUserPassword,
  validateUserRole,
  validateUserUsername,
} from '../components/UserModal';
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

describe('User Accounts Validation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateUserUsername unit logic', () => {
    it('returns error when username is empty or whitespace', () => {
      expect(validateUserUsername('')).toBe('Username is required.');
      expect(validateUserUsername('   ')).toBe('Username is required.');
    });

    it('returns error when username is shorter than 3 characters', () => {
      expect(validateUserUsername('ab')).toBe('Username must be at least 3 characters.');
    });

    it('returns error when username exceeds 50 characters', () => {
      expect(validateUserUsername('a'.repeat(51))).toBe('Username cannot exceed 50 characters.');
    });

    it('returns error when username contains spaces', () => {
      expect(validateUserUsername('john doe')).toBe('Username cannot contain spaces.');
    });

    it('returns error when username contains disallowed characters', () => {
      expect(validateUserUsername('john$doe')).toBe(
        'Username must start with a letter and can only contain letters, numbers, dots, underscores, hyphens, and @.',
      );
      expect(validateUserUsername('admin#clinic')).toBe(
        'Username must start with a letter and can only contain letters, numbers, dots, underscores, hyphens, and @.',
      );
    });

    it('returns error when username starts with a number', () => {
      expect(validateUserUsername('123abc')).toBe(
        'Username must start with a letter and can only contain letters, numbers, dots, underscores, hyphens, and @.',
      );
      expect(validateUserUsername('9user')).toBe(
        'Username must start with a letter and can only contain letters, numbers, dots, underscores, hyphens, and @.',
      );
      expect(validateUserUsername('1234567')).toBe(
        'Username must start with a letter and can only contain letters, numbers, dots, underscores, hyphens, and @.',
      );
    });

    it('returns undefined for valid usernames', () => {
      const valid = ['john_doe', 'admin.clinic', 'nurse-1', 'dr.smith@hospital.org', 'doc123'];
      for (const u of valid) {
        expect(validateUserUsername(u), `Expected "${u}" to be valid`).toBeUndefined();
      }
    });
  });

  describe('validateUserPassword unit logic', () => {
    it('returns error when password is empty on create', () => {
      expect(validateUserPassword('', true)).toBe(
        'Password is required when creating a new user account.',
      );
    });

    it('allows empty password on update', () => {
      expect(validateUserPassword('', false)).toBeUndefined();
    });

    it('returns error when password is less than 6 characters', () => {
      expect(validateUserPassword('12345', true)).toBe('Password must be at least 6 characters long.');
      expect(validateUserPassword('12345', false)).toBe('Password must be at least 6 characters long.');
    });

    it('returns error when password exceeds 100 characters', () => {
      expect(validateUserPassword('a'.repeat(101), true)).toBe(
        'Password cannot exceed 100 characters.',
      );
    });

    it('returns undefined for valid password', () => {
      expect(validateUserPassword('Secr3t!P@ss', true)).toBeUndefined();
      expect(validateUserPassword('Secr3t!P@ss', false)).toBeUndefined();
    });
  });

  describe('validateUserRole unit logic', () => {
    it('returns error when role is empty or invalid', () => {
      expect(validateUserRole('')).toBe('Role is required.');
      expect(validateUserRole('INVALID_ROLE')).toBe('Invalid user role selected.');
    });

    it('returns undefined for valid roles', () => {
      expect(validateUserRole('ADMIN')).toBeUndefined();
      expect(validateUserRole('DOCTOR')).toBeUndefined();
      expect(validateUserRole('PATIENT')).toBeUndefined();
    });
  });

  describe('UserModal Real-time Sanitization & Drawer Form Validation', () => {
    it('sanitizes username on typing by stripping disallowed characters', () => {
      renderWithProviders(
        <UserModal isOpen={true} onClose={vi.fn()} userAccount={null} onSave={vi.fn()} />,
      );

      const usernameInput = screen.getByLabelText(/Username/i) as HTMLInputElement;
      fireEvent.change(usernameInput, { target: { value: 'john!$#_doe' } });
      expect(usernameInput.value).toBe('john_doe');
    });

    it('strips leading digits from username so numbers cannot be typed at the start', () => {
      renderWithProviders(
        <UserModal isOpen={true} onClose={vi.fn()} userAccount={null} onSave={vi.fn()} />,
      );

      const usernameInput = screen.getByLabelText(/Username/i) as HTMLInputElement;

      // Pure digits → empty
      fireEvent.change(usernameInput, { target: { value: '123' } });
      expect(usernameInput.value).toBe('');

      // Leading digits stripped, rest kept
      fireEvent.change(usernameInput, { target: { value: '9abc_user' } });
      expect(usernameInput.value).toBe('abc_user');

      // Digits in the middle are allowed
      fireEvent.change(usernameInput, { target: { value: 'doc123' } });
      expect(usernameInput.value).toBe('doc123');
    });

    it('shows inline validation error when username is blurred while empty', () => {
      renderWithProviders(
        <UserModal isOpen={true} onClose={vi.fn()} userAccount={null} onSave={vi.fn()} />,
      );

      const usernameInput = screen.getByLabelText(/Username/i) as HTMLInputElement;
      fireEvent.focus(usernameInput);
      fireEvent.blur(usernameInput);

      expect(screen.getByText('Username is required.')).toBeInTheDocument();
      expect(usernameInput).toHaveClass('has-error');
    });

    it('clears inline validation error once a valid username is typed', () => {
      renderWithProviders(
        <UserModal isOpen={true} onClose={vi.fn()} userAccount={null} onSave={vi.fn()} />,
      );

      const usernameInput = screen.getByLabelText(/Username/i) as HTMLInputElement;
      fireEvent.focus(usernameInput);
      fireEvent.blur(usernameInput);
      expect(screen.getByText('Username is required.')).toBeInTheDocument();

      fireEvent.change(usernameInput, { target: { value: 'dr_narendran' } });
      expect(screen.queryByText('Username is required.')).not.toBeInTheDocument();
      expect(usernameInput).not.toHaveClass('has-error');
    });

    it('shows password error when password is less than 6 characters', () => {
      renderWithProviders(
        <UserModal isOpen={true} onClose={vi.fn()} userAccount={null} onSave={vi.fn()} />,
      );

      const passwordInput = screen.getByPlaceholderText(/Enter a strong secret passphrase/i);
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.blur(passwordInput);

      expect(screen.getByText('Password must be at least 6 characters long.')).toBeInTheDocument();
      expect(passwordInput).toHaveClass('has-error');
    });

    it('prevents submission when required fields are missing', async () => {
      const handleSave = vi.fn();
      renderWithProviders(
        <UserModal isOpen={true} onClose={vi.fn()} userAccount={null} onSave={handleSave} />,
      );

      const submitBtn = screen.getByRole('button', { name: /Create User Account/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Username is required.')).toBeInTheDocument();
      expect(screen.getByText('Password is required when creating a new user account.')).toBeInTheDocument();
      expect(api).not.toHaveBeenCalled();
      expect(handleSave).not.toHaveBeenCalled();
    });

    it('submits successfully when valid user data is provided', async () => {
      vi.mocked(api).mockResolvedValue({ data: { success: true } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <UserModal
          isOpen={true}
          onClose={handleClose}
          userAccount={null}
          onSave={handleSave}
        />,
      );

      const usernameInput = screen.getByLabelText(/Username/i);
      fireEvent.change(usernameInput, { target: { value: 'reception_front' } });

      const passwordInput = screen.getByPlaceholderText(/Enter a strong secret passphrase/i);
      fireEvent.change(passwordInput, { target: { value: 'SafePass123' } });

      const submitBtn = screen.getByRole('button', { name: /Create User Account/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            url: 'user-accounts',
            data: {
              username: 'reception_front',
              password: 'SafePass123',
              role: 'PATIENT',
              status: 'ACTIVE',
            },
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});

