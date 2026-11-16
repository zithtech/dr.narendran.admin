import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from 'antd';
import { Users } from 'lucide-react';
import { DataView, type Column } from '../components/ui/DataView';
import { CommonTable, type CommonTableColumn } from '../components/ui/CommonTable';

interface TestItem {
  id: string;
  name: string;
  role: string;
}

const mockData: TestItem[] = [
  { id: '1', name: 'John Doe', role: 'Doctor' },
  { id: '2', name: 'Jane Smith', role: 'Nurse' },
];

const mockColumns: Column<TestItem>[] = [
  { id: 'name', header: 'Name', cell: (item) => item.name },
  { id: 'role', header: 'Role', cell: (item) => item.role },
];

const mockCommonColumns: CommonTableColumn<TestItem>[] = [
  { id: 'name', header: 'Name', cell: (item) => item.name },
  { id: 'role', header: 'Role', cell: (item) => item.role },
];

describe('Sticky Headers and Actions Column across Tables', () => {
  it('pins table headers with sticky top-0 and Actions header/cells with sticky right-0 in DataView', () => {
    const { container } = render(
      <App>
        <DataView
          title="Items"
          subtitle="Manage items"
          icon={Users}
          searchPlaceholder="Search items..."
          searchFields={(item) => [item.name, item.role]}
          resource={{
            items: mockData,
            loading: false,
            error: '',
            syncedAt: Date.now(),
            refresh: async () => {},
          }}
          columns={mockColumns}
          facets={[]}
          noun="Item"
          nounPlural="Items"
          onEdit={() => {}}
          onDelete={async () => {}}
        />
      </App>
    );

    // Verify all <th> in thead have sticky top-0
    const allHeaders = container.querySelectorAll('thead tr th');
    expect(allHeaders.length).toBeGreaterThan(0);
    allHeaders.forEach((th) => {
      expect(th.className).toContain('sticky');
      expect(th.className).toContain('top-0');
    });

    // Verify header Actions cell has both sticky top-0 and right-0
    const actionsHeader = screen.getByRole('columnheader', { name: /actions/i });
    expect(actionsHeader.className).toContain('sticky');
    expect(actionsHeader.className).toContain('top-0');
    expect(actionsHeader.className).toContain('right-0');

    // Verify row action cells have sticky right-0
    const actionCells = container.querySelectorAll('tbody tr td:last-child');
    expect(actionCells.length).toBe(mockData.length);
    actionCells.forEach((cell) => {
      expect(cell.className).toContain('sticky');
      expect(cell.className).toContain('right-0');
    });
  });

  it('pins table headers with sticky top-0 and Actions header/cells with sticky right-0 in CommonTable', () => {
    const { container } = render(
      <CommonTable
        data={mockData}
        columns={mockCommonColumns}
        selected={new Set()}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // Verify all <th> in thead have sticky top-0
    const allHeaders = container.querySelectorAll('thead tr th');
    expect(allHeaders.length).toBeGreaterThan(0);
    allHeaders.forEach((th) => {
      expect(th.className).toContain('sticky');
      expect(th.className).toContain('top-0');
    });

    // Verify header Actions cell has both sticky top-0 and right-0
    const actionsHeader = screen.getByRole('columnheader', { name: /actions/i });
    expect(actionsHeader.className).toContain('sticky');
    expect(actionsHeader.className).toContain('top-0');
    expect(actionsHeader.className).toContain('right-0');

    // Verify row action cells have sticky right-0
    const actionCells = container.querySelectorAll('tbody tr td:last-child');
    expect(actionCells.length).toBe(mockData.length);
    actionCells.forEach((cell) => {
      expect(cell.className).toContain('sticky');
      expect(cell.className).toContain('right-0');
    });
  });
});
