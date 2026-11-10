import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { renderWithProviders } from '@/test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders landing page with platform title and portal options', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('Doctor Admin')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Master Admin Portal')).toBeInTheDocument();
    expect(screen.getByText('Hospital Portal')).toBeInTheDocument();
  });

  it('navigates to master login when master admin button is clicked', () => {
    renderWithProviders(<DashboardPage />);

    const masterBtn = screen.getByRole('button', { name: /Sign In to Master/i });
    fireEvent.click(masterBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to hospital demo login when hospital demo button is clicked', () => {
    renderWithProviders(<DashboardPage />);

    const hospitalBtn = screen.getByRole('button', { name: /Sign In to Demo Hospital/i });
    fireEvent.click(hospitalBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/t/T-ABCDEF/login');
  });
});
