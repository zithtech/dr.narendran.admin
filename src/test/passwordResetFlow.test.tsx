import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
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

describe('Forgot Password & Email Reset Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ForgotPasswordPage', () => {
    it('renders email input, Send Reset Link button, and Back to Login option', () => {
      renderWithProviders(<ForgotPasswordPage />);

      expect(screen.getByRole('heading', { name: /Forgot Password/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@hospital.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Login/i })).toBeInTheDocument();
    });

    it('validates email format before submitting', async () => {
      renderWithProviders(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText('you@hospital.com');
      const submitBtn = screen.getByRole('button', { name: /Send Reset Link/i });

      // Test empty email
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Please enter your email address/i)).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();

      // Test invalid email format
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('submits valid email and shows exact success message', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: {
          message: 'If an account exists with this email, you will receive a password reset link.',
        },
      });

      renderWithProviders(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText('you@hospital.com');
      const submitBtn = screen.getByRole('button', { name: /Send Reset Link/i });

      fireEvent.change(emailInput, { target: { value: 'DOCTOR@HOSPITAL.COM' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('tenant/auth/forgot-password', {
          email: 'doctor@hospital.com',
        });
        expect(screen.getByRole('heading', { name: /Reset Link Sent/i })).toBeInTheDocument();
        expect(
          screen.getByText(
            'If an account exists with this email, you will receive a password reset link.',
          ),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Back to Login/i })).toBeInTheDocument();
      });
    });
  });

  describe('ResetPasswordPage', () => {
    it('displays error message if token is missing from URL', async () => {
      // No token parameter
      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Invalid or Expired Link/i })).toBeInTheDocument();
        expect(screen.getByText(/Missing password reset token/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Request New Reset Link/i })).toBeInTheDocument();
      });
    });

    it('validates reset token and displays error when token is invalid or expired', async () => {
      vi.mocked(api.get).mockRejectedValue({
        response: {
          data: {
            error: 'This password reset link is invalid, expired, or has already been used.',
          },
        },
      });

      renderWithProviders(<ResetPasswordPage initialToken="invalid-expired-token" />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('tenant/auth/verify-reset-token', {
          params: { token: 'invalid-expired-token' },
        });
        expect(screen.getByRole('heading', { name: /Invalid or Expired Link/i })).toBeInTheDocument();
        expect(
          screen.getByText(/This password reset link is invalid, expired, or has already been used/i),
        ).toBeInTheDocument();
      });
    });

    it('renders password fields with show/hide toggle and strength checklist when token is valid', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: { valid: true, email: 'dr.subhalakshmi@hospital.com' },
      });

      renderWithProviders(<ResetPasswordPage initialToken="valid-secret-token-123" />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();
      });

      const newPassInput = screen.getByPlaceholderText('Enter new secure password');
      const confirmPassInput = screen.getByPlaceholderText('Re-enter your new password');

      expect(newPassInput).toHaveAttribute('type', 'password');
      expect(confirmPassInput).toHaveAttribute('type', 'password');

      // Test show/hide password buttons
      const showNewPassBtn = screen.getByRole('button', { name: /Show new password/i });
      fireEvent.click(showNewPassBtn);
      expect(newPassInput).toHaveAttribute('type', 'text');

      const showConfirmPassBtn = screen.getByRole('button', { name: /Show confirm password/i });
      fireEvent.click(showConfirmPassBtn);
      expect(confirmPassInput).toHaveAttribute('type', 'text');

      // Check all 5 password requirements are displayed
      expect(screen.getByText('Minimum 8 characters')).toBeInTheDocument();
      expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
      expect(screen.getByText('One lowercase letter')).toBeInTheDocument();
      expect(screen.getByText('One number')).toBeInTheDocument();
      expect(screen.getByText('One special character')).toBeInTheDocument();
      expect(screen.getByText('Passwords match')).toBeInTheDocument();
    });

    it('submits valid new password and shows success state', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: { valid: true, email: 'dr.subhalakshmi@hospital.com' },
      });
      vi.mocked(api.post).mockResolvedValue({
        data: { message: 'Password has been reset successfully.' },
      });

      renderWithProviders(<ResetPasswordPage initialToken="valid-secret-token-123" />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();
      });

      const newPassInput = screen.getByPlaceholderText('Enter new secure password');
      const confirmPassInput = screen.getByPlaceholderText('Re-enter your new password');

      // Type strong password meeting all 5 requirements
      fireEvent.change(newPassInput, { target: { value: 'Secret@1234' } });
      fireEvent.change(confirmPassInput, { target: { value: 'Secret@1234' } });

      const submitBtn = screen.getByRole('button', { name: /Reset Password/i });
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('tenant/auth/reset-password', {
          token: 'valid-secret-token-123',
          password: 'Secret@1234',
        });
        expect(screen.getByRole('heading', { name: /Password Reset Successful/i })).toBeInTheDocument();
        expect(screen.getByText(/Your password has been securely updated/i)).toBeInTheDocument();
      });
    });
  });
});
