import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchableSelect, { type SearchableSelectOption } from '../components/ui/SearchableSelect';

const sampleOptions: SearchableSelectOption[] = [
  { value: '', label: 'All Doctors' },
  { value: 'doc-1', label: 'Dr. Bharathi', sublabel: '5★ (1 reviews)' },
  { value: 'doc-2', label: 'admin' },
  { value: 'doc-3', label: 'Dr. Narendran' },
];

describe('SearchableSelect Dropdown Escape / Portal Verification', () => {
  it('renders dropdown menu directly into document.body via portal by default', () => {
    const handleChange = vi.fn();

    const { container } = render(
      <div style={{ overflow: 'hidden', height: 100, width: 200 }} data-testid="clipping-parent">
        <SearchableSelect
          options={sampleOptions}
          value=""
          onChange={handleChange}
          placeholder="All Doctors"
        />
      </div>
    );

    const trigger = screen.getByRole('button', { name: /all doctors/i });
    expect(trigger).toBeInTheDocument();

    // Before opening, menu is not in DOM
    expect(document.querySelector('.ui-searchable-menu')).toBeNull();

    // Open dropdown
    fireEvent.click(trigger);

    const menu = document.querySelector('.ui-searchable-menu') as HTMLElement;
    expect(menu).not.toBeNull();

    // Verify it is mounted in document.body, NOT trapped inside the overflow:hidden parent
    expect(menu?.parentElement).toBe(document.body);
    expect(container.querySelector('.ui-searchable-menu')).toBeNull();

    // Verify options are visible and selectable inside the portal menu
    expect(within(menu).getByText('Dr. Bharathi')).toBeInTheDocument();
    expect(within(menu).getByText('admin')).toBeInTheDocument();

    // Click 'admin' option
    fireEvent.click(within(menu).getByText('admin'));
    expect(handleChange).toHaveBeenCalledWith('doc-2');

    // Dropdown closes after selection
    expect(document.querySelector('.ui-searchable-menu')).toBeNull();
  });

  it('supports portal={false} to render in-flow inside container when explicitly requested', () => {
    const handleChange = vi.fn();

    const { container } = render(
      <SearchableSelect
        options={sampleOptions}
        value=""
        onChange={handleChange}
        portal={false}
      />
    );

    const trigger = screen.getByRole('button', { name: /all doctors/i });
    fireEvent.click(trigger);

    const menu = document.querySelector('.ui-searchable-menu');
    expect(menu).not.toBeNull();

    // In-flow rendering: mounted directly within the SearchableSelect container
    expect(container.contains(menu)).toBe(true);
    expect(menu?.parentElement).not.toBe(document.body);
  });

  it('closes dropdown when clicking outside the menu and trigger', () => {
    const handleChange = vi.fn();

    render(
      <div>
        <button type="button" data-testid="outside-button">
          Outside Element
        </button>
        <SearchableSelect
          options={sampleOptions}
          value=""
          onChange={handleChange}
        />
      </div>
    );

    const trigger = screen.getByRole('button', { name: /all doctors/i });
    fireEvent.click(trigger);
    expect(document.querySelector('.ui-searchable-menu')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-button'));
    expect(document.querySelector('.ui-searchable-menu')).toBeNull();
  });

  it('allows searching within the portaled menu', () => {
    const handleChange = vi.fn();

    render(
      <SearchableSelect
        options={sampleOptions}
        value=""
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /all doctors/i }));

    const menu = document.querySelector('.ui-searchable-menu') as HTMLElement;
    expect(menu).not.toBeNull();

    const searchInput = within(menu).getByPlaceholderText('Search options...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'admin' } });

    expect(within(menu).getByText('admin')).toBeInTheDocument();
    expect(within(menu).queryByText('Dr. Bharathi')).toBeNull();
  });
});
