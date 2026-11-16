import { Button, Spin, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import {
  AlertCircle,
  FileClock,
  History,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { TimelineEventItem } from '../features/timelines/components/TimelineEventItem';
import { TimelineFilterBar } from '../features/timelines/components/TimelineFilterBar';
import { TimelineHeaderCard } from '../features/timelines/components/TimelineHeaderCard';
import { TimelineHealthSummary } from '../features/timelines/components/TimelineHealthSummary';
import { patientTimelinesApi } from '../features/timelines/services/patientTimelinesApi';
import type {
  HealthSummaryData,
  PatientTimelineHeader,
  TimelineEvent,
  TimelineFilterType,
} from '../features/timelines/types/patientTimelines';

const { Title, Text } = Typography;

export default function PatientTimelineDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Patient & Clinical Data
  const [patientHeader, setPatientHeader] = useState<PatientTimelineHeader | null>(null);
  const [healthSummary, setHealthSummary] = useState<HealthSummaryData | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  // Filters & Pagination
  const [selectedType, setSelectedType] = useState<TimelineFilterType>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  // Infinite Scroll Sentinel & Sync Refs
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef<boolean>(false);
  const hasNextPageRef = useRef<boolean>(false);
  const pageRef = useRef<number>(1);

  loadingMoreRef.current = loadingMore;
  hasNextPageRef.current = hasNextPage;
  pageRef.current = page;

  // Dynamic height measurement of sticky Patient Header for pixel-perfect sticky Filter placement
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el) {
        setHeaderHeight(el.offsetHeight);
      }
    };

    updateHeight();

    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    window.addEventListener('resize', updateHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [patientHeader]);

  const loadTimeline = useCallback(
    async (isAppend = false, targetPage = 1) => {
      if (!patientId) return;

      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setLoadMoreError(null);

      try {
        const params: Record<string, string | number> = {
          page: targetPage,
          limit: 20,
          type: selectedType,
        };

        if (dateRange?.[0] && dateRange?.[1]) {
          params.from_date = dateRange[0].format('YYYY-MM-DD');
          params.to_date = dateRange[1].format('YYYY-MM-DD');
        } else if (selectedYear !== 'All') {
          params.year = selectedYear;
        }

        const data = await patientTimelinesApi.getPatientTimeline(patientId, params);

        if (data) {
          setPatientHeader(data.patient);
          setHealthSummary(data.summary);

          if (isAppend) {
            setTimelineEvents((prev) => [...prev, ...data.timeline]);
          } else {
            setTimelineEvents(data.timeline);
          }

          setPage(targetPage);
          setHasNextPage(Boolean(data.pagination?.has_next));
          setTotalEvents(data.pagination?.total ?? data.timeline.length);
        }
      } catch (err: unknown) {
        const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
        const msg =
          errorObj?.response?.data?.message ??
          errorObj?.message ??
          'Failed to load patient medical timeline.';
        if (isAppend) {
          setLoadMoreError(msg);
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [patientId, selectedType, selectedYear, dateRange],
  );

  useEffect(() => {
    let ignore = false;
    if (!patientId) return;

    const fetchInitial = async () => {
      try {
        const params: Record<string, string | number> = {
          page: 1,
          limit: 20,
          type: selectedType,
        };

        if (dateRange?.[0] && dateRange?.[1]) {
          params.from_date = dateRange[0].format('YYYY-MM-DD');
          params.to_date = dateRange[1].format('YYYY-MM-DD');
        } else if (selectedYear !== 'All') {
          params.year = selectedYear;
        }

        const data = await patientTimelinesApi.getPatientTimeline(patientId, params);

        if (!ignore && data) {
          setPatientHeader(data.patient);
          setHealthSummary(data.summary);
          setTimelineEvents(data.timeline);
          setPage(1);
          setHasNextPage(Boolean(data.pagination?.has_next));
          setTotalEvents(data.pagination?.total ?? data.timeline.length);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
          const msg =
            errorObj?.response?.data?.message ??
            errorObj?.message ??
            'Failed to load patient medical timeline.';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchInitial();

    return () => {
      ignore = true;
    };
  }, [patientId, selectedType, selectedYear, dateRange]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPageRef.current && !loadingMoreRef.current && !loading) {
      loadingMoreRef.current = true;
      void loadTimeline(true, pageRef.current + 1);
    }
  }, [loading, loadTimeline]);

  // Automatic Infinite Scroll: loads older medical records automatically on scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || loading) return;

    // Detect closest scrollable container (.ui-main in SidebarLayout)
    const scrollContainer = sentinel.closest<HTMLElement>('.ui-main');

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry?.isIntersecting) {
            handleLoadMore();
          }
        },
        {
          root: scrollContainer || null,
          rootMargin: '300px 0px',
          threshold: 0,
        },
      );
      observer.observe(sentinel);
    }

    // Passive scroll listener fallback for responsive/custom scroll contexts
    const handleScroll = () => {
      if (!hasNextPageRef.current || loadingMoreRef.current) return;
      const target = scrollContainer || document.documentElement;
      const isNearBottom =
        target === document.documentElement
          ? window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 350
          : target.scrollTop + target.clientHeight >= target.scrollHeight - 350;

      if (isNearBottom) {
        handleLoadMore();
      }
    };

    const scrollTarget = scrollContainer || window;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer?.disconnect();
      scrollTarget.removeEventListener('scroll', handleScroll);
    };
  }, [hasNextPage, loading, handleLoadMore]);

  return (
    <div className="patient-timeline-detail-page w-full min-h-full block relative">
      {/* Loading Skeleton */}
      {loading && !patientHeader ? (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-10">
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200 space-y-4 shadow-2xs">
            <Spin size="large" />
            <div className="text-sm text-gray-500 font-medium">
              Loading patient medical history and clinical events...
            </div>
          </div>
        </div>
      ) : error && !patientHeader ? (
        /* Error State */
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-10">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4 shadow-2xs">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <Title level={4} className="!mb-1 text-gray-900">
              Unable to Load Patient Timeline
            </Title>
            <Text type="secondary" className="text-sm block">
              {error}
            </Text>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                onClick={() => {
                  void navigate('/patient-timelines');
                }}
              >
                Back to Patient List
              </Button>
              <Button
                type="primary"
                className="bg-teal-700 hover:bg-teal-800"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => {
                  void loadTimeline(false, 1);
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Patient Profile Header Card (Sticky directly beneath TopNavbar, spanning full width with zero gaps) */}
          {patientHeader && (
            <div
              ref={headerRef}
              className="sticky top-0 z-30 w-full bg-white shadow-2xs"
              style={{ position: 'sticky', top: 0, zIndex: 30 }}
            >
              <TimelineHeaderCard patient={patientHeader} />
            </div>
          )}

          {/* 2. Main Page Body: Content aligned directly with sticky header inner elements */}
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 space-y-3.5 sm:space-y-4 pt-4 pb-10">
            {/* Health Summary Card */}
            {healthSummary && (
              <TimelineHealthSummary summary={healthSummary} />
            )}

            {/* Event Category & Period Filter Bar (Sticky directly beneath Patient Profile Header) */}
            <div
              className="sticky z-20 bg-[#f8fafc] pt-2 pb-3.5 -mt-2"
              style={{ position: 'sticky', top: headerHeight, zIndex: 20 }}
            >
              <TimelineFilterBar
                selectedType={selectedType}
                onSelectType={(type) => {
                  setSelectedType(type);
                  setPage(1);
                }}
                selectedYear={selectedYear}
                onSelectYear={(yr) => {
                  setSelectedYear(yr);
                  setPage(1);
                }}
                dateRange={dateRange}
                onDateRangeChange={(dates) => {
                  setDateRange(dates);
                  setPage(1);
                }}
                totalEvents={totalEvents}
              />
            </div>

            {/* Chronological Timeline Feed */}
            <div className="pt-2 sm:pt-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-teal-700" />
                  Chronological Medical Events (Newest First)
                </span>
                <span className="text-xs text-gray-400">
                  Displaying {timelineEvents.length} of {totalEvents} records
                </span>
              </div>

              {timelineEvents.length > 0 ? (
                <div className="space-y-0">
                  {timelineEvents.map((evt, idx) => (
                    <TimelineEventItem
                      key={evt.id || idx}
                      event={evt}
                      isLast={idx === timelineEvents.length - 1}
                    />
                  ))}

                  {/* Automatic Infinite Scroll Sentinel & Loading Indicator */}
                  {hasNextPage && (
                    <div ref={sentinelRef} className="pt-4 pb-2 text-center">
                      {loadingMore ? (
                        <div className="flex items-center justify-center gap-2 text-teal-800 py-2">
                          <Spin size="small" />
                          <span className="text-xs font-medium text-slate-500">
                            Loading older medical records...
                          </span>
                        </div>
                      ) : (
                        <div className="h-6 w-full flex items-center justify-center text-xs text-slate-400">
                          <span className="inline-block w-2 h-2 rounded-full bg-teal-600/40 animate-pulse mr-2" />
                          <span>Loading older records as you scroll...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Load More Error with Retry */}
                  {loadMoreError && (
                    <div className="pt-3 pb-2 text-center flex items-center justify-center gap-2">
                      <span className="text-xs text-rose-500">{loadMoreError}</span>
                      <Button
                        size="small"
                        onClick={() => {
                          setLoadMoreError(null);
                          handleLoadMore();
                        }}
                        className="text-xs border-teal-700 text-teal-800 hover:bg-teal-50"
                      >
                        Retry
                      </Button>
                    </div>
                  )}

                  {/* End of Timeline Indicator */}
                  {!hasNextPage && timelineEvents.length > 0 && (
                    <div className="pt-6 pb-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <span className="w-10 h-px bg-slate-200" />
                      <span>All medical events loaded</span>
                      <span className="w-10 h-px bg-slate-200" />
                    </div>
                  )}
                </div>
              ) : (
                /* Empty Timeline State */
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center space-y-3">
                  <FileClock className="w-12 h-12 text-gray-400 mx-auto" />
                  <div className="text-base font-bold text-gray-800">
                    No Clinical Events Found
                  </div>
                  <div className="text-xs text-gray-500 max-w-md mx-auto">
                    {selectedType !== 'All' || selectedYear !== 'All' || dateRange
                      ? `No medical events match the selected category ("${selectedType}") or date filter. Try selecting "All Events" or resetting filters.`
                      : 'This patient has no recorded consultations, prescriptions, lab reports, or medical history yet.'}
                  </div>
                  {(selectedType !== 'All' || selectedYear !== 'All' || dateRange) && (
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedType('All');
                        setSelectedYear('All');
                        setDateRange(null);
                      }}
                    >
                      Clear Filter Selection
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
