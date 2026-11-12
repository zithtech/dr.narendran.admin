import { screen, waitFor } from '@testing-library/react';
import { Building2 } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataView, PrimaryCell } from '../components/ui/DataView';
import { PermissionProvider, usePermission } from '../context/PermissionContext';
import type { Resource } from '../hooks/useResource';
import DoctorAvailabilityPage from '../pages/DoctorAvailabilityPage';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => {
  const fn = vi.fn();
  (fn as unknown as { get: ReturnType<typeof vi.fn> }).get = vi.fn();
  (fn as unknown as { post: ReturnType<typeof vi.fn> }).post = vi.fn();
  (fn as unknown as { put: ReturnType<typeof vi.fn> }).put = vi.fn();
  (fn as unknown as { delete: ReturnType<typeof vi.fn> }).delete = vi.fn();
  return { default: fn };
});

interface SampleRow {
  id: string;
  name: string;
  created_at: string;
}

function PermissionProbe() {
  const { canView, canCreate, canUpdate, canDelete, isLoading } = usePermission();
  if (isLoading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="avail-view">{String(canView('AVAILABILITY'))}</span>
      <span data-testid="avail-create">{String(canCreate('AVAILABILITY'))}</span>
      <span data-testid="avail-update">{String(canUpdate('AVAILABILITY'))}</span>
      <span data-testid="avail-delete">{String(canDelete('AVAILABILITY'))}</span>
      <span data-testid="docs-delete">{String(canDelete('DOCTORS'))}</span>
    </div>
  );
}

describe('RBAC UI Action Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('enforces exact AVAILABILITY permissions for Doctor without inheriting from DOCTORS or fallback overrides', async () => {
    localStorage.setItem('adminRole', 'DOCTOR');

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        name: 'DOCTOR',
        is_system_role: false,
        permissions: [
          { module_slug: 'AVAILABILITY', can_read: true, can_write: false, can_delete: false },
          { module_slug: 'DOCTORS', can_read: true, can_write: true, can_delete: true },
        ],
      },
    });

    renderWithProviders(
      <PermissionProvider>
        <PermissionProbe />
      </PermissionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('avail-view')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('avail-create')).toHaveTextContent('false');
    expect(screen.getByTestId('avail-update')).toHaveTextContent('false');
    expect(screen.getByTestId('avail-delete')).toHaveTextContent('false');
    expect(screen.getByTestId('docs-delete')).toHaveTextContent('true');
  });

  it('completely hides Create, Edit, and Delete controls in DataView when user only has Read permission', async () => {
    localStorage.setItem('adminRole', 'DOCTOR');

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        name: 'DOCTOR',
        is_system_role: false,
        permissions: [
          { module_slug: 'HOSPITALS', can_read: true, can_write: false, can_delete: false },
        ],
      },
    });

    const resource: Resource<SampleRow> = {
      items: [{ id: 'h-1', name: 'Main Hospital', created_at: '2026-11-01T10:00:00.000Z' }],
      loading: false,
      error: '',
      syncedAt: Date.now(),
      refresh: vi.fn(async () => {}),
    };

    renderWithProviders(
      <PermissionProvider>
        <DataView
          moduleSlug="HOSPITALS"
          title="Hospitals"
          subtitle="Manage hospitals"
          icon={Building2}
          noun="hospital"
          nounPlural="hospitals"
          resource={resource}
          searchPlaceholder="Search..."
          searchFields={(r) => [r.name]}
          facets={[]}
          dateOf={(r) => r.created_at}
          columns={[
            {
              id: 'name',
              header: 'Hospital',
              cell: (r) => <PrimaryCell name={r.name} />,
            },
          ]}
          createLabel="Add Hospital"
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn(async () => {})}
          nameOf={(r) => r.name}
        />
      </PermissionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Main Hospital')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Add Hospital/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit Main Hospital/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete Main Hospital/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Select Main Hospital')).not.toBeInTheDocument();
  });

  it('shows Edit but hides Delete in DataView when user has Read and Write without Delete permission', async () => {
    localStorage.setItem('adminRole', 'DOCTOR');

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        name: 'DOCTOR',
        is_system_role: false,
        permissions: [
          { module_slug: 'HOSPITALS', can_read: true, can_write: true, can_delete: false },
        ],
      },
    });

    const resource: Resource<SampleRow> = {
      items: [{ id: 'h-1', name: 'Main Hospital', created_at: '2026-11-01T10:00:00.000Z' }],
      loading: false,
      error: '',
      syncedAt: Date.now(),
      refresh: vi.fn(async () => {}),
    };

    renderWithProviders(
      <PermissionProvider>
        <DataView
          moduleSlug="HOSPITALS"
          title="Hospitals"
          subtitle="Manage hospitals"
          icon={Building2}
          noun="hospital"
          nounPlural="hospitals"
          resource={resource}
          searchPlaceholder="Search..."
          searchFields={(r) => [r.name]}
          facets={[]}
          dateOf={(r) => r.created_at}
          columns={[
            {
              id: 'name',
              header: 'Hospital',
              cell: (r) => <PrimaryCell name={r.name} />,
            },
          ]}
          createLabel="Add Hospital"
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn(async () => {})}
          nameOf={(r) => r.name}
        />
      </PermissionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit Main Hospital/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Add Hospital/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete Main Hospital/i })).not.toBeInTheDocument();
  });

  it('hides Add, Edit, Delete, and Apply Slot Duration controls on DoctorAvailabilityPage when AVAILABILITY is Read-only', async () => {
    localStorage.setItem('adminRole', 'DOCTOR');

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.startsWith('rbac/roles/')) {
        return Promise.resolve({
          data: {
            name: 'DOCTOR',
            is_system_role: false,
            permissions: [
              { module_slug: 'AVAILABILITY', can_read: true, can_write: false, can_delete: false },
              { module_slug: 'DOCTORS', can_read: true, can_write: true, can_delete: true },
            ],
          },
        });
      }
      if (url === 'doctors') {
        return Promise.resolve({
          data: [
            {
              id: 'doc-1',
              name: 'Dr. Bharathi',
              specialization: 'Haematology',
              hospital_id: 'h-1',
              hospital_name: 'Narendran Hospital',
              branch_name: 'Chennai',
            },
          ],
        });
      }
      if (url === 'branches') {
        return Promise.resolve({
          data: [{ id: 'br-1', name: 'Chennai', hospital_id: 'h-1' }],
        });
      }
      if (url === 'doctor-availability/doctor/doc-1') {
        return Promise.resolve({
          data: [
            {
              id: 'slot-1',
              doctor_id: 'doc-1',
              branch_id: 'br-1',
              branch_name: 'Chennai',
              day_of_week: 'MONDAY',
              start_time: '09:00:00',
              end_time: '17:00:00',
              slot_length: 30,
              status: 'ACTIVE',
            },
          ],
        });
      }
      if (url === 'doctor-availability/doctor/doc-1/blocked-dates') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(
      <PermissionProvider>
        <DoctorAvailabilityPage />
      </PermissionProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.queryByRole('button', { name: /Add Availability Slot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Block Date \/ Time/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add to Monday/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete slot/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Apply Slot Duration to All Schedules/i }),
    ).not.toBeInTheDocument();
  });

  it('shows Edit and Add but hides Delete controls on DoctorAvailabilityPage when AVAILABILITY has Read and Write only', async () => {
    localStorage.setItem('adminRole', 'DOCTOR');

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.startsWith('rbac/roles/')) {
        return Promise.resolve({
          data: {
            name: 'DOCTOR',
            is_system_role: false,
            permissions: [
              { module_slug: 'AVAILABILITY', can_read: true, can_write: true, can_delete: false },
            ],
          },
        });
      }
      if (url === 'doctors') {
        return Promise.resolve({
          data: [
            {
              id: 'doc-1',
              name: 'Dr. Bharathi',
              specialization: 'Haematology',
              hospital_id: 'h-1',
              hospital_name: 'Narendran Hospital',
              branch_name: 'Chennai',
            },
          ],
        });
      }
      if (url === 'branches') {
        return Promise.resolve({
          data: [{ id: 'br-1', name: 'Chennai', hospital_id: 'h-1' }],
        });
      }
      if (url === 'doctor-availability/doctor/doc-1') {
        return Promise.resolve({
          data: [
            {
              id: 'slot-1',
              doctor_id: 'doc-1',
              branch_id: 'br-1',
              branch_name: 'Chennai',
              day_of_week: 'MONDAY',
              start_time: '09:00:00',
              end_time: '17:00:00',
              slot_length: 30,
              status: 'ACTIVE',
            },
          ],
        });
      }
      if (url === 'doctor-availability/doctor/doc-1/blocked-dates') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(
      <PermissionProvider>
        <DoctorAvailabilityPage />
      </PermissionProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.getByRole('button', { name: /Add Availability Slot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Monday/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete slot/i })).not.toBeInTheDocument();
  });

  it('distinguishes granular Create vs Update vs Manage permissions in DataView', async () => {
    localStorage.setItem('adminRole', 'DOCTOR');

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        name: 'DOCTOR',
        is_system_role: false,
        permissions: [
          {
            module_slug: 'HOSPITALS',
            can_read: true,
            can_create: false,
            can_update: true,
            can_delete: false,
            can_manage: false,
          },
        ],
      },
    });

    const resource: Resource<SampleRow> = {
      items: [{ id: 'h-1', name: 'Main Hospital', created_at: '2026-11-01T10:00:00.000Z' }],
      loading: false,
      error: '',
      syncedAt: Date.now(),
      refresh: vi.fn(async () => {}),
    };

    renderWithProviders(
      <PermissionProvider>
        <DataView
          moduleSlug="HOSPITALS"
          title="Hospitals"
          subtitle="Manage hospitals"
          icon={Building2}
          noun="hospital"
          nounPlural="hospitals"
          resource={resource}
          searchPlaceholder="Search..."
          searchFields={(r) => [r.name]}
          facets={[]}
          dateOf={(r) => r.created_at}
          columns={[
            {
              id: 'name',
              header: 'Hospital',
              cell: (r) => <PrimaryCell name={r.name} />,
            },
          ]}
          createLabel="Add Hospital"
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn(async () => {})}
          nameOf={(r) => r.name}
        />
      </PermissionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit Main Hospital/i })).toBeInTheDocument();
    });

    // Update is granted, while Create and Delete remain hidden
    expect(screen.queryByRole('button', { name: /Add Hospital/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete Main Hospital/i })).not.toBeInTheDocument();
  });
});

