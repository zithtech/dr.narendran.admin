import { App } from 'antd';
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { ConfirmDialog } from '../../../components/ui/Modal';
import { cx, StatusDot } from '../../../components/ui/primitives';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { timeAgo } from '../../../lib/format';
import { locationsApi } from '../services/locationsApi';
import type {
  DoctorLocation,
  DoctorSummaryWithLocations,
} from '../types/locations';
import { LocationModal } from './LocationModal';

const SKELETON_ROWS = Array.from({ length: 4 }, (_, i) => i);
const PAGE_SIZES = [10, 20, 50];

interface DoctorLocationCardsViewProps {
  doctorId?: string; // If in Admin mode, doctor's specific ID
  doctorProfile?: DoctorSummaryWithLocations | null;
  isDoctorRole?: boolean;
}

export const DoctorLocationCardsView: React.FC<DoctorLocationCardsViewProps> = ({
  doctorId,
  doctorProfile,
  isDoctorRole = false,
}) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [locations, setLocations] = useState<DoctorLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Modal & Confirm State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<DoctorLocation | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<DoctorLocation | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut ⌘K / Ctrl+K to focus search (matching Patients page)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update relative sync label periodically
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await locationsApi.getLocations(doctorId);
      setLocations(data);
      setSyncedAt(Date.now());
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Failed to load locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, message]);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const handleMakePrimary = async (record: DoctorLocation) => {
    if (record.is_primary) return;
    try {
      setActionLoading(`primary-${record.id}`);
      await locationsApi.setPrimaryLocation(record.id, doctorId);
      message.success(`"${record.location_name}" set as primary practice location`);
      await fetchLocations();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Failed to update primary location');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!locationToDelete) return;
    if (locationToDelete.is_primary) {
      message.error('Cannot delete primary location. Set another location as primary first.');
      setLocationToDelete(null);
      return;
    }

    try {
      setActionLoading(`delete-${locationToDelete.id}`);
      await locationsApi.deleteLocation(locationToDelete.id, doctorId);
      message.success(`Location "${locationToDelete.location_name}" deleted successfully`);
      setLocationToDelete(null);
      await fetchLocations();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error ||
          'Cannot delete primary location. Set another location as primary first.',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setModalOpen(true);
  };

  const openEditModal = (loc: DoctorLocation) => {
    setEditingLocation(loc);
    setModalOpen(true);
  };

  const doctorDisplayName = doctorProfile?.name
    ? doctorProfile.name.startsWith('Dr.')
      ? doctorProfile.name
      : `Dr. ${doctorProfile.name}`
    : isDoctorRole
      ? 'My Practice Locations'
      : 'Doctor Locations';

  // Filtered rows
  const filteredLocations = useMemo(() => {
    let result = locations;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (loc) =>
          loc.location_name?.toLowerCase().includes(q) ||
          loc.address?.toLowerCase().includes(q),
      );
    }

    if (statusFilter) {
      result = result.filter((loc) => {
        const isActive = !loc.status || loc.status.toUpperCase() === 'ACTIVE';
        return statusFilter === 'ACTIVE' ? isActive : !isActive;
      });
    }

    return result;
  }, [locations, search, statusFilter]);

  const hasActiveFilters = Boolean(search || statusFilter);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / limit));
  const startIdx = (page - 1) * limit;
  const endIdx = Math.min(startIdx + limit, filteredLocations.length);
  const pageRows = filteredLocations.slice(startIdx, endIdx);

  const syncedLabel = syncedAt
    ? `Last synced ${timeAgo(new Date(syncedAt).toISOString(), now)}`
    : null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | string)[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="ui-page space-y-3">
      {/* ── Compact Page Header Matching Patients Page ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {!isDoctorRole && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              onClick={() => navigate('/locations')}
              title="Return to doctors listing"
            >
              <ArrowLeft size={13} />
              <span>All Doctors</span>
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
                {doctorDisplayName}
              </h1>
              {doctorProfile?.specialization && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 shrink-0">
                  {doctorProfile.specialization}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal truncate">
              {isDoctorRole
                ? 'Manage your clinical practice locations, consultation chambers, and primary clinic.'
                : `Managing clinical practice locations and consultation chambers for ${doctorDisplayName}.`}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {syncedLabel && (
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline-block mr-1">
              {syncedLabel}
            </span>
          )}

          <button
            type="button"
            className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            onClick={() => void fetchLocations()}
            disabled={loading}
            title="Refresh locations"
            aria-label="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            onClick={openAddModal}
          >
            <Plus size={13} strokeWidth={2.4} />
            <span>Add New Location</span>
          </button>
        </div>
      </header>

      {/* ── Main Unified Container: Filters Toolbar + Table + Pagination (Matching Patients Page Design) ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* ── Filter Bar Section ── */}
        <div className="flex items-center gap-2 flex-wrap px-3 sm:px-3.5 py-2.5 border-b border-slate-100 bg-white">
          {/* Search Input with ⌘K */}
          <div className="relative flex items-center flex-1 min-w-[160px] sm:min-w-[220px] max-w-full sm:max-w-xs shrink-0">
            <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search location name, address..."
              className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              aria-label="Search locations"
            />
            <span className="absolute right-2 text-[10px] text-slate-400 pointer-events-none select-none font-medium hidden sm:inline">
              ⌘K
            </span>
          </div>

          {/* Status Filter Dropdown */}
          <div className="shrink-0 flex-1 sm:flex-initial min-w-[125px] sm:min-w-0">
            <SearchableSelect
              size="sm"
              variant="default"
              aria-label="Status"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              placeholder="All Status"
              searchable={false}
              options={[
                { value: '', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active only' },
                { value: 'INACTIVE', label: 'Inactive only' },
              ]}
            />
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Reset all filters"
            >
              <span>Reset</span>
              <X size={12} className="text-slate-500" />
            </button>
          )}
        </div>

        {/* ── Table Section ── */}
        <div className="overflow-x-auto min-h-[260px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                <th className="px-3.5 py-2 whitespace-nowrap">Location / Clinic</th>
                <th className="px-3.5 py-2 whitespace-nowrap">Map Link</th>
                <th className="px-3.5 py-2 text-center whitespace-nowrap">Status</th>
                <th className="px-3.5 py-2 text-right whitespace-nowrap font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {loading && locations.length === 0 ? (
                SKELETON_ROWS.map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3.5 py-2">
                      <div className="h-4 bg-slate-100 rounded w-44 mb-1" />
                      <div className="h-3 bg-slate-50 rounded w-64" />
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="h-3.5 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <div className="h-4 bg-slate-100 rounded w-14 mx-auto" />
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <div className="h-6 bg-slate-100 rounded w-32 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                        {hasActiveFilters ? <SearchX size={22} /> : <Building2 size={22} />}
                      </div>
                      <strong className="text-xs font-semibold text-slate-700">
                        {hasActiveFilters
                          ? 'No matching practice locations found'
                          : 'No practice locations registered yet'}
                      </strong>
                      <span className="text-[11px] text-slate-500 max-w-sm">
                        {hasActiveFilters
                          ? 'Try adjusting your search criteria or clearing filters.'
                          : isDoctorRole
                            ? "You haven't added any practice locations yet. Add your primary consultation chamber to get started."
                            : "This doctor doesn't have any registered practice locations yet."}
                      </span>
                      <div className="mt-1.5">
                        {hasActiveFilters ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            onClick={resetFilters}
                          >
                            Clear filters
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-2xs"
                            onClick={openAddModal}
                          >
                            <Plus size={13} /> Add First Location
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((loc) => {
                  const isCurrentPrimary = Boolean(loc.is_primary);
                  const isActive = !loc.status || loc.status.toUpperCase() === 'ACTIVE';

                  return (
                    <tr key={loc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Location & Address */}
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">
                            {loc.location_name}
                          </span>
                          {isCurrentPrimary && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">
                              <Star size={10} className="fill-amber-500 text-amber-500" />
                              Primary Practice Location
                            </span>
                          )}
                        </div>
                        {loc.address ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 max-w-xl truncate">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{loc.address}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic mt-0.5">
                            No street address specified
                          </div>
                        )}
                      </td>

                      {/* Map Link */}
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        {loc.map_link ? (
                          <a
                            href={loc.map_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <span>View on Map</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <StatusDot active={isActive} label={isActive ? 'Active' : 'Inactive'} />
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCurrentPrimary && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-800 hover:bg-amber-100/80 transition-colors shadow-2xs cursor-pointer"
                              onClick={() => void handleMakePrimary(loc)}
                              disabled={actionLoading === `primary-${loc.id}`}
                              title="Set as primary practice location"
                            >
                              <Star size={11} />
                              <span>Make Primary</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => openEditModal(loc)}
                            title="Edit practice location"
                            aria-label="Edit Location"
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            type="button"
                            className={cx(
                              'p-1 rounded-md transition-colors',
                              isCurrentPrimary
                                ? 'text-slate-300 cursor-not-allowed opacity-50'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer',
                            )}
                            onClick={() => {
                              if (isCurrentPrimary) {
                                message.error(
                                  'Cannot delete primary location. Set another location as primary first.',
                                );
                                return;
                              }
                              setLocationToDelete(loc);
                            }}
                            disabled={isCurrentPrimary}
                            title={
                              isCurrentPrimary
                                ? 'Cannot delete primary location'
                                : 'Delete practice location'
                            }
                            aria-label="Delete Location"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer / Pagination (Matching Patients Page DataView) ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-t border-slate-100 bg-white text-xs text-slate-500 w-full">
          <div className="text-center sm:text-left w-full sm:w-auto">
            {filteredLocations.length === 0 ? (
              'No practice locations'
            ) : (
              <>
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {startIdx + 1}–{endIdx}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{filteredLocations.length}</span>{' '}
                locations
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 mr-1 sm:mr-2 shrink-0">
              <span className="text-slate-500">Per page</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                aria-label="Rows per page"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={14} />
              </button>

              {pageNumbers.map((p, idx) =>
                typeof p === 'number' ? (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={cx(
                      'w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-2xs',
                      page === p
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 select-none">
                    …
                  </span>
                ),
              )}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                aria-label="Next page"
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Location Drawer */}
      <LocationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => void fetchLocations()}
        editingLocation={editingLocation}
        doctorId={doctorId}
        doctorName={doctorDisplayName}
      />

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        open={Boolean(locationToDelete)}
        title="Delete Practice Location"
        message={
          locationToDelete ? (
            <p>
              Are you sure you want to delete practice location{' '}
              <strong>"{locationToDelete.location_name}"</strong>? This will remove the clinic from
              the doctor's available appointment locations.
            </p>
          ) : null
        }
        confirmLabel="Delete Location"
        onConfirm={handleConfirmDelete}
        onClose={() => setLocationToDelete(null)}
      />
    </div>
  );
};
