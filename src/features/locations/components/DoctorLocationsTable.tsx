import { App } from 'antd';
import {
  Building2,
  MapPin,
  RefreshCw,
  Search,
  SearchX,
  Stethoscope,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { CommonPagination } from '../../../components/ui/CommonTable';
import { Badge, StatusDot } from '../../../components/ui/primitives';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { ViewModeSwitcher } from '../../../components/ui/ViewModeSwitcher';
import { DoctorQualificationTable } from '../../../components/DoctorQualificationBadge';
import { resolveImageUrl } from '../../../utils/doctorAvatar';
import { usePermission } from '../../../context/PermissionContext';
import { timeAgo } from '../../../lib/format';
import { locationsApi } from '../services/locationsApi';
import type { DoctorSummaryWithLocations } from '../types/locations';

const SKELETON_ROWS = Array.from({ length: 6 }, (_, i) => i);

export const DoctorLocationsTable: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { canUpdate, canManage } = usePermission();
  const isLocManageable = canUpdate('LOCATIONS', ['DOCTORS']) || canManage('LOCATIONS', ['DOCTORS']);
  const [doctors, setDoctors] = useState<DoctorSummaryWithLocations[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [specializationFilter, setSpecializationFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

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

  const fetchDoctors = async (searchTerm?: string) => {
    try {
      setLoading(true);
      const data = await locationsApi.getDoctors(searchTerm);
      setDoctors(data);
      setSyncedAt(Date.now());
    } catch {
      setDoctors([]);
      message.error('Failed to load doctor practice locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDoctors();
  }, []);

  // Extract unique specializations for filter dropdown
  const uniqueSpecializations = useMemo(() => {
    const set = new Set<string>();
    for (const doc of doctors) {
      const spec = doc.specialization || doc.specialty;
      if (spec?.trim()) set.add(spec.trim());
    }
    return Array.from(set).sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    let result = doctors;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (doc) =>
          doc.name?.toLowerCase().includes(q) ||
          doc.specialty?.toLowerCase().includes(q) ||
          doc.specialization?.toLowerCase().includes(q) ||
          doc.phone?.toLowerCase().includes(q) ||
          doc.email?.toLowerCase().includes(q),
      );
    }

    if (specializationFilter) {
      result = result.filter((doc) => {
        const spec = doc.specialization || doc.specialty;
        return spec?.trim() === specializationFilter;
      });
    }

    if (statusFilter) {
      result = result.filter((doc) => {
        const isActive = !doc.status || doc.status.toUpperCase() === 'ACTIVE';
        return statusFilter === 'ACTIVE' ? isActive : !isActive;
      });
    }

    return result;
  }, [doctors, search, specializationFilter, statusFilter]);

  const hasActiveFilters = Boolean(search || specializationFilter || statusFilter);

  const resetFilters = () => {
    setSearch('');
    setSpecializationFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / limit));
  const startIdx = (page - 1) * limit;
  const endIdx = Math.min(startIdx + limit, filteredDoctors.length);
  const pageRows = filteredDoctors.slice(startIdx, endIdx);

  const syncedLabel = syncedAt
    ? `Last synced ${timeAgo(new Date(syncedAt).toISOString(), now)}`
    : null;

  return (
    <div className="ui-page space-y-3">
      {/* ── Compact Page Header Matching Patients Page ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            Location Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            View and manage clinical practice locations and consultation chambers for registered
            doctors.
          </p>
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
            onClick={() => void fetchDoctors()}
            disabled={loading}
            title="Refresh doctors list"
            aria-label="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* ── Main Unified Container: Filters Toolbar + Table + Pagination (Matching Patients Page Design) ── */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* ── Filter Bar Section ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 sm:px-3.5 py-2.5 border-b border-slate-100 bg-white">
          {/* Search Input with ⌘K */}
          <div className="relative flex items-center w-full sm:w-auto sm:flex-1 sm:min-w-[220px] sm:max-w-xs shrink-0">
            <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search doctor, specialization, contact..."
              className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              aria-label="Search doctors"
            />
            <span className="absolute right-2 text-[10px] text-slate-400 pointer-events-none select-none font-medium hidden sm:inline">
              ⌘K
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Specialization Filter Dropdown */}
            <div className="flex-1 sm:flex-initial min-w-[140px] sm:min-w-0">
              <SearchableSelect
                size="sm"
                variant="default"
                aria-label="Specialization"
                value={specializationFilter}
                onChange={(val) => {
                  setSpecializationFilter(val);
                  setPage(1);
                }}
                placeholder="All Specializations"
                searchable={true}
                searchPlaceholder="Filter specialization..."
                options={[
                  { value: '', label: 'All Specializations' },
                  ...uniqueSpecializations.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex-1 sm:flex-initial min-w-[125px] sm:min-w-0">
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

            {/* View Mode Switcher */}
            <ViewModeSwitcher
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>

        {/* ── Cards View Section ── */}
        {viewMode === 'cards' && (
          <div className="p-3 sm:p-4 bg-slate-50/50 min-h-[300px] border-b border-slate-200">
            {loading && doctors.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {SKELETON_ROWS.map((i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-slate-100 rounded w-28" />
                        <div className="h-3 bg-slate-50 rounded w-20" />
                      </div>
                    </div>
                    <div className="h-4 bg-slate-100 rounded w-24" />
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="h-6 bg-slate-100 rounded w-20" />
                      <div className="h-6 bg-slate-100 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                    {hasActiveFilters ? <SearchX size={22} /> : <Building2 size={22} />}
                  </div>
                  <strong className="text-xs font-semibold text-slate-700">
                    {hasActiveFilters ? 'No matching doctors found' : 'No doctors registered yet'}
                  </strong>
                  <span className="text-[11px] text-slate-500 max-w-sm">
                    {hasActiveFilters
                      ? 'Try adjusting your search criteria or clearing filters.'
                      : 'Doctor profiles will appear here once registered in the system.'}
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="mt-1.5 inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pageRows.map((doc) => {
                  const locationCount = Number(doc.locations_count || 0);
                  const isActive = !doc.status || doc.status.toUpperCase() === 'ACTIVE';
                  const spec = doc.specialization || doc.specialty || 'General Medicine';
                  const initials = doc.name
                    ? doc.name
                        .replace(/^Dr\.\s*/i, '')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'DR';

                  return (
                    <div
                      key={doc.id}
                      className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between hover:border-slate-300 transition-all gap-3 cursor-pointer"
                      onClick={() => navigate(`/locations/${doc.id}`)}
                    >
                      {/* Doctor Profile Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {doc.profile_image_url ? (
                            <img
                              src={resolveImageUrl(doc.profile_image_url) || doc.profile_image_url}
                              alt={doc.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-sm truncate">
                              {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {doc.phone || doc.email || 'No contact provided'}
                            </div>
                          </div>
                        </div>
                        <StatusDot active={isActive} label={isActive ? 'Active' : 'Inactive'} />
                      </div>

                      {/* Doctor Details */}
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 text-[11px]">Specialization:</span>
                          <span className="font-medium text-slate-700 truncate max-w-[170px]">
                            {spec}
                          </span>
                        </div>
                        {doc.qualification && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 text-[11px]">Qualification:</span>
                            <DoctorQualificationTable qualification={doc.qualification} />
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 text-[11px]">Practice Locations:</span>
                          <Badge tone={locationCount > 0 ? 'blue' : 'neutral'}>
                            <Building2 size={11} className="mr-1 inline" />
                            <span>
                              {locationCount} {locationCount === 1 ? 'Location' : 'Locations'}
                            </span>
                          </Badge>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/locations/${doc.id}`);
                          }}
                          aria-label={isLocManageable ? 'Manage Locations' : 'View Locations'}
                        >
                          <MapPin size={12} className="text-blue-600 shrink-0" />
                          <span>{isLocManageable ? 'Manage Locations' : 'View Locations'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Table Section ── */}
        {viewMode === 'table' && (
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse" style={{ minWidth: 680 }}>
            <thead>
              <tr className="border-b border-slate-200/90 bg-[#f8fafc] text-[11px] font-semibold text-slate-600">
                <th className="px-3.5 py-2 whitespace-nowrap">Doctor</th>
                <th className="px-3.5 py-2 whitespace-nowrap">Specialization</th>
                <th className="px-3.5 py-2 whitespace-nowrap">Qualification</th>
                <th className="px-3.5 py-2 text-center whitespace-nowrap">Registered Locations</th>
                <th className="px-3.5 py-2 text-center whitespace-nowrap">Status</th>
                <th className="px-3.5 py-2 text-right whitespace-nowrap font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {loading && doctors.length === 0 ? (
                SKELETON_ROWS.map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3.5 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                        <div className="space-y-1">
                          <div className="h-3.5 bg-slate-100 rounded w-28" />
                          <div className="h-2.5 bg-slate-50 rounded w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="h-3.5 bg-slate-100 rounded w-24" />
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="h-3.5 bg-slate-100 rounded w-16" />
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <div className="h-5 bg-slate-100 rounded w-20 mx-auto" />
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <div className="h-4 bg-slate-100 rounded w-14 mx-auto" />
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <div className="h-6 bg-slate-100 rounded w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="p-2.5 rounded-full bg-slate-50 text-slate-400">
                        {hasActiveFilters ? <SearchX size={22} /> : <Building2 size={22} />}
                      </div>
                      <strong className="text-xs font-semibold text-slate-700">
                        {hasActiveFilters ? 'No matching doctors found' : 'No doctors registered yet'}
                      </strong>
                      <span className="text-[11px] text-slate-500 max-w-sm">
                        {hasActiveFilters
                          ? 'Try adjusting your search criteria or clearing filters.'
                          : 'Doctor profiles will appear here once registered in the system.'}
                      </span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="mt-1.5 inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          onClick={resetFilters}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((doc) => {
                  const locationCount = Number(doc.locations_count || 0);
                  const isActive = !doc.status || doc.status.toUpperCase() === 'ACTIVE';
                  const spec = doc.specialization || doc.specialty || 'General Medicine';
                  const initials = doc.name
                    ? doc.name
                        .replace(/^Dr\.\s*/i, '')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'DR';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Doctor Info */}
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-2.5">
                          {doc.profile_image_url ? (
                            <img
                              src={resolveImageUrl(doc.profile_image_url) || doc.profile_image_url}
                              alt={doc.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {doc.phone || doc.email || 'No contact provided'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Specialization */}
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Stethoscope size={13} className="text-blue-500 shrink-0" />
                          <span>{spec}</span>
                        </div>
                      </td>

                      {/* Qualification */}
                      <td className="px-3.5 py-2 text-slate-600">
                        <DoctorQualificationTable qualification={doc.qualification} maxVisible={2} />
                      </td>

                      {/* Registered Locations Count */}
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <Badge tone={locationCount > 0 ? 'blue' : 'neutral'}>
                          <Building2 size={11} className="mr-1 inline" />
                          <span>
                            {locationCount} {locationCount === 1 ? 'Location' : 'Locations'}
                          </span>
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <StatusDot active={isActive} label={isActive ? 'Active' : 'Inactive'} />
                      </td>

                      {/* Action */}
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          onClick={() => navigate(`/locations/${doc.id}`)}
                          aria-label={isLocManageable ? 'Manage Locations' : 'View Locations'}
                        >
                          <MapPin size={12} className="text-blue-600 shrink-0" />
                          <span className="hidden sm:inline">{isLocManageable ? 'Manage Locations' : 'View Locations'}</span>
                          <span className="sm:hidden">{isLocManageable ? 'Manage' : 'View'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* ── Footer / Pagination (Matching SupportCenterPage & CommonTable) ── */}
        <CommonPagination
          total={filteredDoctors.length}
          startIdx={filteredDoctors.length === 0 ? 0 : startIdx + 1}
          endIdx={endIdx}
          nounPlural="doctors"
          page={page}
          pageCount={totalPages}
          perPage={limit}
          onPageChange={(p) => setPage(p)}
          onPerPageChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
};
