import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '../pages/SettingsPage';
import SidebarLayout from '../components/SidebarLayout';
import { PermissionProvider, ModuleRouteGuard } from '../context/PermissionContext';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn().mockImplementation((url: string) => {
      console.log('API GET CALLED:', url);
      if (url.includes('rbac/roles')) {
        return Promise.resolve({
          data: {
            name: 'SUPER_ADMIN',
            is_system_role: true,
            permissions: [
              { module_slug: 'SETTINGS', can_read: true, can_write: true, can_delete: true, can_manage: true },
              { module_slug: 'DASHBOARD', can_read: true, can_write: true, can_delete: true, can_manage: true },
            ],
          },
        });
      }
      return Promise.resolve({
        data: {
          firstName: 'System',
          lastName: 'Admin',
          logoUrl: 'https://example.com/logo.png',
          email: 'admin@example.com',
          role: 'SUPER_ADMIN',
        },
      });
    }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    post: vi.fn().mockResolvedValue({ data: { logoUrl: 'https://example.com/logo.png' } }),
  },
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.setItem('adminToken', 'test-token');
    localStorage.setItem('adminRole', 'SUPER_ADMIN');
    localStorage.setItem('adminUsername', 'admin@example.com');
  });

  it('renders settings page directly without crashing', async () => {
    renderWithProviders(<SettingsPage />);
    await waitFor(
      () => {
        expect(screen.getByText(/^First Name/i)).toBeInTheDocument();
        expect(screen.getByText(/^Last Name/i)).toBeInTheDocument();
        expect(screen.getByText(/Logo Upload/i)).toBeInTheDocument();
        expect(screen.getByText(/Logo Preview/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
        // Email and Role must be completely removed
        expect(screen.queryByText(/Assigned Role/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Account Email/i)).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it('renders SidebarLayout with /settings route', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AntdApp>
          <PermissionProvider>
            <MemoryRouter initialEntries={['/settings']}>
              <Routes>
                <Route path="/" element={<SidebarLayout />}>
                  <Route
                    path="settings"
                    element={
                      <ModuleRouteGuard module="SETTINGS" title="Settings">
                        <SettingsPage />
                      </ModuleRouteGuard>
                    }
                  />
                </Route>
              </Routes>
            </MemoryRouter>
          </PermissionProvider>
        </AntdApp>
      </QueryClientProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByText(/^First Name/i)).toBeInTheDocument();
        expect(screen.getByText(/^Last Name/i)).toBeInTheDocument();
        expect(screen.getByText(/Logo Upload/i)).toBeInTheDocument();
        expect(screen.getByText(/Logo Preview/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });
});
