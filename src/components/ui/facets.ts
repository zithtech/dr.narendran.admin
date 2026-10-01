import { monthKey, monthLabel, titleCase } from '../../lib/format';
import type { Facet } from './DataView';

/** Facets every admin resource shares: status and the month it was added. */

export function statusFacet<T extends { status: string }>(): Facet<T> {
  return {
    id: 'status',
    label: 'Status',
    allLabel: 'All statuses',
    value: (item) => item.status,
    optionLabel: titleCase,
    order: ['ACTIVE', 'INACTIVE'],
  };
}

export function addedFacet<T extends { created_at: string }>(): Facet<T> {
  return {
    id: 'added',
    label: 'Added',
    allLabel: 'All months',
    value: (item) => monthKey(item.created_at),
    optionLabel: monthLabel,
    sortBy: 'value-desc',
  };
}
