import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Login from '../pages/Login';
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

describe('Login & Forgot Password Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Login page with username, password, sign in button, and Forgot password option', () => {
    renderWithProviders(<Login />);

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@hospital.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();

    // Check Forgot password option is clearly present on Login page
    const forgotBtn = screen.getByRole('button', { name: /Forgot password\?/i });
    expect(forgotBtn).toBeInTheDocument();
  });

  it('clicking Forgot password switches to the Reset Password view with reset fields and Back to Sign in', async () => {
    renderWithProviders(<Login />);

    const usernameInput = screen.getByPlaceholderText('you@hospital.com');
    fireEvent.change(usernameInput, { target: { value: 'admin' } });

    const forgotBtn = screen.getByRole('button', { name: /Forgot password\?/i });
    fireEvent.click(forgotBtn);

    // Should switch to Reset Password view
    expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. admin or you@hospital\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('At least 6 characters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Re-enter your new password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset Password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Sign in/i })).toBeInTheDocument();

    // Pre-fills identifier from login form
    const identifierInput = screen.getByPlaceholderText(/e\.g\. admin or you@hospital\.com/i);
    expect(identifierInput).toHaveValue('admin');
  });

  it('validates password mismatch on the reset form', async () => {
    renderWithProviders(<Login defaultForgot={true} />);

    const identifierInput = screen.getByPlaceholderText(/e\.g\. admin or you@hospital\.com/i);
    const newPassInput = screen.getByPlaceholderText('At least 6 characters');
    const confirmPassInput = screen.getByPlaceholderText('Re-enter your new password');

    fireEvent.change(identifierInput, { target: { value: 'testuser' } });
    fireEvent.change(newPassInput, { target: { value: 'secret123' } });
    fireEvent.change(confirmPassInput, { target: { value: 'different123' } });

    const submitBtn = screen.getByRole('button', { name: /Reset Password/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits reset password successfully and allows signing in with new credentials', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { message: 'Password has been reset successfully.' },
    });

    renderWithProviders(<Login defaultForgot={true} />);

    const identifierInput = screen.getByPlaceholderText(/e\.g\. admin or you@hospital\.com/i);
    const newPassInput = screen.getByPlaceholderText('At least 6 characters');
    const confirmPassInput = screen.getByPlaceholderText('Re-enter your new password');

    fireEvent.change(identifierInput, { target: { value: 'dr_narendran' } });
    fireEvent.change(newPassInput, { target: { value: 'newSecurePass123' } });
    fireEvent.change(confirmPassInput, { target: { value: 'newSecurePass123' } });

    const submitBtn = screen.getByRole('button', { name: /Reset Password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('tenant/auth/reset-password', {
        identifier: 'dr_narendran',
        password: 'newSecurePass123',
      });
      expect(screen.getByText(/Password has been reset successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign in with New Password/i })).toBeInTheDocument();
    });

    // Clicking "Sign in with New Password" navigates back to Login
    fireEvent.click(screen.getByRole('button', { name: /Sign in with New Password/i }));
    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@hospital.com')).toHaveValue('dr_narendran');
  });

  it('supports requesting reset assistance via forgot-password API', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { message: 'If the account exists, a password reset request has been processed.' },
    });

    renderWithProviders(<Login defaultForgot={true} />);

    const identifierInput = screen.getByPlaceholderText(/e\.g\. admin or you@hospital\.com/i);
    fireEvent.change(identifierInput, { target: { value: 'admin@hospital.com' } });

    const assistanceBtn = screen.getByRole('button', { name: /Request reset assistance/i });
    fireEvent.click(assistanceBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('tenant/auth/forgot-password', {
        identifier: 'admin@hospital.com',
      });
      expect(screen.getByText(/password reset request has been processed/i)).toBeInTheDocument();
    });
  });

  it('clicking Back to Sign in returns back to the standard login form', async () => {
    renderWithProviders(<Login defaultForgot={true} />);

    expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: /Back to Sign in/i });
    fireEvent.click(backBtn);

    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Forgot password\?/i })).toBeInTheDocument();
  });
});
