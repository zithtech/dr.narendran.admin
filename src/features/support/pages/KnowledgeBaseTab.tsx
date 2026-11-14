import { App } from 'antd';
import {
  BookOpen,
  CheckCircle,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CommonFilterBar,
  CommonPagination,
  CommonTable,
  type CommonTableColumn,
  type FilterDropdownOption,
  type FilterTabOption,
  StatusPill,
} from '../../../components/ui/CommonTable';
import { Drawer, DrawerSection } from '../../../components/ui/Drawer';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { ActivityCell, Badge, cx } from '../../../components/ui/primitives';
import { timeAgo } from '../../../lib/format';
import { getErrorMessage } from '../../../utils/errors';
import { usePermission } from '../../../context/PermissionContext';
import { adminSupportApi } from '../api/adminSupportApi';
import type { SupportKnowledgeArticle, TicketCategory } from '../types/support';

export interface KnowledgeBaseTabProps {
  userType?: 'PATIENT' | 'DOCTOR' | 'ALL';
}

interface ArticleFormValues {
  title: string;
  slug: string;
  category: TicketCategory;
  content: string;
  keywords: string[];
  isFaq: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  audience: 'DOCTOR' | 'PATIENT' | 'ALL';
}

const DOCTOR_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'APPOINTMENTS', label: 'Appointments & Bookings' },
  { value: 'PRESCRIPTIONS', label: 'Prescriptions & Clinical Notes' },
  { value: 'SCHEDULE_AVAILABILITY', label: 'Schedule & Slot Availability' },
  { value: 'PATIENT_CONSULTATION', label: 'Patient Consultation & EHR' },
  { value: 'PAYOUTS_SETTLEMENTS', label: 'Doctor Payouts & Settlements' },
  { value: 'LAB_REPORTS', label: 'Diagnostic Lab Reports' },
  { value: 'TECHNICAL_HELP', label: 'Doctor App Technical Help' },
  { value: 'GENERAL_INQUIRY', label: 'General Clinical Inquiries' },
];

const PATIENT_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'APPOINTMENTS', label: 'Doctor Appointments & Visits' },
  { value: 'PRESCRIPTIONS', label: 'Prescriptions & Medication Advice' },
  { value: 'MEDICINE_ORDERS', label: 'Pharmacy & Medicine Orders' },
  { value: 'LAB_REPORTS', label: 'Lab Test Reports' },
  { value: 'PAYMENTS', label: 'Billing, Invoices & Payments' },
  { value: 'TECHNICAL_HELP', label: 'Patient App Technical Support' },
  { value: 'GENERAL_INQUIRY', label: 'General Clinic Inquiries' },
];

const ALL_CATEGORIES: { value: TicketCategory; label: string }[] = [
  ...DOCTOR_CATEGORIES,
  ...PATIENT_CATEGORIES.filter((p) => !DOCTOR_CATEGORIES.some((d) => d.value === p.value)),
];

const categoryLabelMap = new Map<string, string>(ALL_CATEGORIES.map((c) => [c.value, c.label]));
const formatCategory = (cat: string) => categoryLabelMap.get(cat) || cat.replace(/_/g, ' ');

export const KnowledgeBaseTab: React.FC<KnowledgeBaseTabProps> = ({
  userType = 'ALL',
}) => {
  const isDoctorView = userType === 'DOCTOR';
  const isPatientView = userType === 'PATIENT';

  const { message } = App.useApp();
  const { canCreate, canUpdate, canDelete } = usePermission();
  const isCreatable = isDoctorView
    ? canCreate('DOCTOR_SUPPORT', ['SUPPORT', 'PATIENT_SUPPORT'])
    : canCreate('PATIENT_SUPPORT', ['SUPPORT', 'DOCTOR_SUPPORT']);
  const isUpdatable = isDoctorView
    ? canUpdate('DOCTOR_SUPPORT', ['SUPPORT', 'PATIENT_SUPPORT'])
    : canUpdate('PATIENT_SUPPORT', ['SUPPORT', 'DOCTOR_SUPPORT']);
  const isDeletable = isDoctorView
    ? canDelete('DOCTOR_SUPPORT', ['SUPPORT', 'PATIENT_SUPPORT'])
    : canDelete('PATIENT_SUPPORT', ['SUPPORT', 'DOCTOR_SUPPORT']);

  const activeCategoryList = isDoctorView
    ? DOCTOR_CATEGORIES
    : isPatientView
    ? PATIENT_CATEGORIES
    : ALL_CATEGORIES;

  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<SupportKnowledgeArticle[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [activeQuickTab, setActiveQuickTab] = useState<'all' | 'faq' | 'published' | 'draft'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);

  // Common Drawer State
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<SupportKnowledgeArticle | null>(null);
  const [formValues, setFormValues] = useState<ArticleFormValues>({
    title: '',
    slug: '',
    category: isDoctorView ? 'SCHEDULE_AVAILABILITY' : 'APPOINTMENTS',
    content: '',
    keywords: [],
    isFaq: true,
    status: 'PUBLISHED',
    audience: isDoctorView ? 'DOCTOR' : isPatientView ? 'PATIENT' : 'ALL',
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation
  const [deleteConfirmArticle, setDeleteConfirmArticle] = useState<SupportKnowledgeArticle | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminSupportApi.getArticles({
        category: categoryFilter,
        search: search.trim() ? search.trim() : undefined,
      });
      setArticles(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setArticles([]);
      void message.error(getErrorMessage(err, 'Failed to load articles'));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search, message]);

  useEffect(() => {
    void fetchArticles();
  }, [fetchArticles]);

  // Metrics
  const totalArticles = articles.length;
  const faqCount = useMemo(() => articles.filter((a) => a.is_faq).length, [articles]);
  const publishedCount = useMemo(() => articles.filter((a) => a.status === 'PUBLISHED').length, [articles]);
  const draftCount = useMemo(() => articles.filter((a) => a.status === 'DRAFT').length, [articles]);
  const helpfulCount = useMemo(() => articles.reduce((acc, a) => acc + (a.helpful_count || 0), 0), [articles]);
  const notHelpfulCount = useMemo(() => articles.reduce((acc, a) => acc + (a.not_helpful_count || 0), 0), [articles]);
  const totalFeedback = helpfulCount + notHelpfulCount;
  const positiveRate = totalFeedback > 0 ? Math.round((helpfulCount / totalFeedback) * 100) : 100;

  // Filtered & Sorted
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (activeQuickTab === 'faq' && !a.is_faq) return false;
      if (activeQuickTab === 'published' && a.status !== 'PUBLISHED') return false;
      if (activeQuickTab === 'draft' && a.status !== 'DRAFT') return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (categoryFilter && a.category !== categoryFilter) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesTitle = (a.title || '').toLowerCase().includes(q);
        const matchesSlug = (a.slug || '').toLowerCase().includes(q);
        const matchesContent = (a.content || '').toLowerCase().includes(q);
        const matchesKeywords = (a.keywords || []).some((kw) => kw.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSlug && !matchesContent && !matchesKeywords) return false;
      }
      return true;
    });
  }, [articles, activeQuickTab, statusFilter, categoryFilter, search]);

  const sortedArticles = useMemo(() => {
    if (!sort) return filteredArticles;
    return [...filteredArticles].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sort.id === 'title') {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      } else if (sort.id === 'category') {
        aVal = a.category;
        bVal = b.category;
      } else if (sort.id === 'status') {
        aVal = a.status;
        bVal = b.status;
      } else if (sort.id === 'feedback') {
        aVal = a.helpful_count || 0;
        bVal = b.helpful_count || 0;
      } else if (sort.id === 'updated_at') {
        aVal = new Date(a.updated_at || a.created_at).getTime();
        bVal = new Date(b.updated_at || b.created_at).getTime();
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sort.dir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [filteredArticles, sort]);

  const handleSortChange = (colId: string) => {
    setSort((prev) => {
      if (prev?.id === colId) {
        if (prev.dir === 'asc') return { id: colId, dir: 'desc' };
        return null;
      }
      return { id: colId, dir: 'asc' };
    });
  };

  const totalCount = sortedArticles.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / limit));
  const startIdx = totalCount > 0 ? (page - 1) * limit + 1 : 0;
  const endIdx = Math.min(totalCount, page * limit);
  const paginatedArticles = useMemo(() => {
    const from = (page - 1) * limit;
    return sortedArticles.slice(from, from + limit);
  }, [sortedArticles, page, limit]);

  // Drawer Handlers
  const handleOpenCreateDrawer = () => {
    setEditingArticle(null);
    setFormValues({
      title: '',
      slug: '',
      category: isDoctorView ? 'SCHEDULE_AVAILABILITY' : 'APPOINTMENTS',
      content: '',
      keywords: [],
      isFaq: true,
      status: 'PUBLISHED',
      audience: isDoctorView ? 'DOCTOR' : isPatientView ? 'PATIENT' : 'ALL',
    });
    setKeywordInput('');
    setDrawerVisible(true);
  };

  const handleOpenEditDrawer = (article: SupportKnowledgeArticle) => {
    setEditingArticle(article);
    setFormValues({
      title: article.title,
      slug: article.slug,
      category: article.category,
      content: article.content,
      keywords: article.keywords ?? [],
      isFaq: article.is_faq,
      status: article.status,
      audience: isDoctorView ? 'DOCTOR' : isPatientView ? 'PATIENT' : 'ALL',
    });
    setKeywordInput('');
    setDrawerVisible(true);
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (!trimmed) return;
    if (!formValues.keywords.includes(trimmed)) {
      setFormValues((prev) => ({ ...prev, keywords: [...prev.keywords, trimmed] }));
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setFormValues((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((kw) => kw !== kwToRemove),
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.title.trim()) {
      void message.error('Please enter an article title');
      return;
    }
    if (!formValues.content.trim()) {
      void message.error('Please enter article content');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formValues.title.trim(),
        slug:
          formValues.slug.trim() ||
          formValues.title
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        category: formValues.category,
        content: formValues.content.trim(),
        keywords: formValues.keywords,
        isFaq: formValues.isFaq,
        status: formValues.status,
      };

      if (editingArticle) {
        await adminSupportApi.updateArticle(editingArticle.id, payload);
        void message.success('Article updated successfully');
      } else {
        await adminSupportApi.createArticle(payload);
        void message.success(
          isDoctorView
            ? 'Doctor knowledge article created and published'
            : 'Patient knowledge article created and published',
        );
      }
      setDrawerVisible(false);
      await fetchArticles();
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to save article'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await adminSupportApi.deleteArticle(id);
      void message.success('Article removed successfully');
      setDrawerVisible(false);
      await fetchArticles();
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to delete article'));
    }
  };

  // Filter Bar Options
  const filterTabs: FilterTabOption[] = [
    {
      id: 'all',
      label: 'All Articles',
      count: totalArticles,
      active: activeQuickTab === 'all',
      onClick: () => {
        setActiveQuickTab('all');
        setPage(1);
      },
    },
    {
      id: 'faq',
      label: 'FAQ Cards',
      count: faqCount,
      active: activeQuickTab === 'faq',
      onClick: () => {
        setActiveQuickTab('faq');
        setPage(1);
      },
    },
    {
      id: 'published',
      label: 'Published',
      count: publishedCount,
      active: activeQuickTab === 'published',
      onClick: () => {
        setActiveQuickTab('published');
        setPage(1);
      },
    },
    {
      id: 'draft',
      label: 'Drafts',
      count: draftCount,
      active: activeQuickTab === 'draft',
      onClick: () => {
        setActiveQuickTab('draft');
        setPage(1);
      },
    },
  ];

  const filterDropdowns: FilterDropdownOption[] = [
    {
      id: 'category',
      label: 'Category',
      allLabel: 'All Categories',
      value: categoryFilter ?? '',
      onChange: (val) => {
        setCategoryFilter(val || undefined);
        setPage(1);
      },
      options: activeCategoryList.map((c) => ({ value: c.value, label: c.label })),
    },
    {
      id: 'status',
      label: 'Status',
      allLabel: 'All Statuses',
      value: statusFilter ?? '',
      onChange: (val) => {
        setStatusFilter(val || undefined);
        setPage(1);
      },
      options: [
        { value: 'PUBLISHED', label: 'Published' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'ARCHIVED', label: 'Archived' },
      ],
    },
  ];

  const hasActiveFilters = Boolean(
    activeQuickTab !== 'all' || categoryFilter || statusFilter || search.trim(),
  );

  const handleResetFilters = () => {
    setActiveQuickTab('all');
    setCategoryFilter(undefined);
    setStatusFilter(undefined);
    setSearch('');
    setPage(1);
  };

  // Columns
  const columns: CommonTableColumn<SupportKnowledgeArticle>[] = [
    {
      id: 'title',
      header: isDoctorView ? 'Doctor Guide / Article' : isPatientView ? 'Patient Guide / Article' : 'Article / Guide',
      sort: (a) => a.title.toLowerCase(),
      cell: (article) => (
        <div className="max-w-[340px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenEditDrawer(article)}
              className="text-xs font-semibold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer"
            >
              {article.title}
            </button>
            {article.is_faq && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 uppercase tracking-wider">
                FAQ Card
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
            /{article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      sort: (a) => a.category,
      width: 190,
      cell: (article) => <Badge tone="blue">{formatCategory(article.category)}</Badge>,
    },
    {
      id: 'keywords',
      header: 'Keywords',
      width: 190,
      cell: (article) => {
        const kws = article.keywords || [];
        return (
          <div className="flex items-center gap-1 flex-wrap max-w-[190px]">
            {kws.slice(0, 3).map((kw, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10.5px]">
                {kw}
              </span>
            ))}
            {kws.length > 3 && (
              <span className="text-[10px] text-slate-400">+{kws.length - 3}</span>
            )}
            {kws.length === 0 && <span className="text-[11px] text-slate-400 italic">No tags</span>}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      sort: (a) => a.status,
      width: 130,
      cell: (article) => {
        if (article.status === 'PUBLISHED') return <StatusPill label="Published" tone="green" />;
        if (article.status === 'DRAFT') return <StatusPill label="Draft" tone="amber" />;
        return <StatusPill label="Archived" tone="gray" />;
      },
    },
    {
      id: 'feedback',
      header: 'Feedback',
      sort: (a) => a.helpful_count || 0,
      width: 130,
      cell: (article) => (
        <div className="flex items-center gap-2.5 text-xs font-medium">
          <span className="inline-flex items-center gap-1 text-emerald-600" title="Helpful count">
            <ThumbsUp size={12} className="shrink-0" />
            <span>{article.helpful_count || 0}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-rose-500" title="Not helpful count">
            <ThumbsDown size={12} className="shrink-0" />
            <span>{article.not_helpful_count || 0}</span>
          </span>
        </div>
      ),
    },
    {
      id: 'updated_at',
      header: 'Last Updated',
      sort: (a) => new Date(a.updated_at || a.created_at).getTime(),
      width: 140,
      cell: (article) => (
        <ActivityCell
          label="Updated"
          when={timeAgo(article.updated_at || article.created_at)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* 1. KPI Metric Cards matching Dashboard design & layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Total Articles */}
        <div
          className={cx(
            'ui-dash-stat-card',
            activeQuickTab === 'all' && !categoryFilter && !statusFilter && 'ring-2 ring-blue-500/40 border-blue-400 bg-blue-50/20',
          )}
          onClick={() => {
            setActiveQuickTab('all');
            setCategoryFilter(undefined);
            setStatusFilter(undefined);
            setPage(1);
          }}
          role="button"
          tabIndex={0}
          title="All Knowledge Articles"
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <BookOpen size={16} strokeWidth={2} className="ui-dash-stat-icon text-blue-600" />
              <span className="ui-dash-stat-title">
                {isDoctorView ? 'Doctor Articles' : isPatientView ? 'Patient Articles' : 'Total Articles'}
              </span>
            </div>
            <button
              type="button"
              className="ui-dash-stat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleResetFilters();
              }}
              aria-label="All articles options"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>

          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value">
              {loading && articles.length === 0 ? '…' : totalArticles.toLocaleString()}
            </span>
            <span className="ui-dash-stat-badge is-blue">
              <BookOpen size={10} strokeWidth={2.5} />
              <span>Library</span>
            </span>
          </div>

          <div className="ui-dash-stat-sub">
            {isDoctorView ? 'Clinician guidance & protocols' : 'Patient assistance & triage'}
          </div>
        </div>

        {/* FAQs */}
        <div
          className={cx(
            'ui-dash-stat-card',
            activeQuickTab === 'faq' && 'ring-2 ring-purple-500/40 border-purple-400 bg-purple-50/20',
          )}
          onClick={() => {
            setActiveQuickTab(activeQuickTab === 'faq' ? 'all' : 'faq');
            setPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by FAQ Quick Cards"
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <HelpCircle size={16} strokeWidth={2} className="ui-dash-stat-icon text-purple-600" />
              <span className="ui-dash-stat-title">
                {isDoctorView ? 'Doctor FAQs' : isPatientView ? 'Patient FAQs' : 'FAQ Quick Cards'}
              </span>
            </div>
            <button
              type="button"
              className="ui-dash-stat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveQuickTab('faq');
                setPage(1);
              }}
              aria-label="FAQ options"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>

          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value">
              {loading && articles.length === 0 ? '…' : faqCount.toLocaleString()}
            </span>
            <span className="ui-dash-stat-badge is-purple">
              <HelpCircle size={10} strokeWidth={2.5} />
              <span>Quick FAQ</span>
            </span>
          </div>

          <div className="ui-dash-stat-sub">
            {isDoctorView ? 'Featured in Doctor Portal' : 'Featured in Patient App'}
          </div>
        </div>

        {/* Published Guides */}
        <div
          className={cx(
            'ui-dash-stat-card',
            activeQuickTab === 'published' && 'ring-2 ring-emerald-500/40 border-emerald-400 bg-emerald-50/20',
          )}
          onClick={() => {
            setActiveQuickTab(activeQuickTab === 'published' ? 'all' : 'published');
            setPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by Published Articles"
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <CheckCircle size={16} strokeWidth={2} className="ui-dash-stat-icon text-emerald-600" />
              <span className="ui-dash-stat-title">Published Guides</span>
            </div>
            <button
              type="button"
              className="ui-dash-stat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveQuickTab('published');
                setPage(1);
              }}
              aria-label="Published options"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>

          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value">
              {loading && articles.length === 0 ? '…' : publishedCount.toLocaleString()}
            </span>
            <span className="ui-dash-stat-badge is-green">
              <CheckCircle size={10} strokeWidth={2.5} />
              <span>Active</span>
            </span>
          </div>

          <div className="ui-dash-stat-sub">Live for AI Chatbot grounding</div>
        </div>

        {/* Helpful Ratings */}
        <div
          className="ui-dash-stat-card"
          onClick={() => {
            setSort({ id: 'feedback', dir: 'desc' });
            setPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Sort by Most Helpful"
        >
          <div className="ui-dash-stat-top">
            <div className="ui-dash-stat-label-wrap">
              <ThumbsUp size={16} strokeWidth={2} className="ui-dash-stat-icon text-amber-600" />
              <span className="ui-dash-stat-title">Helpful Ratings</span>
            </div>
            <button
              type="button"
              className="ui-dash-stat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSort({ id: 'feedback', dir: 'desc' });
                setPage(1);
              }}
              aria-label="Feedback options"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>

          <div className="ui-dash-stat-mid">
            <span className="ui-dash-stat-value">
              {loading && articles.length === 0 ? '…' : helpfulCount.toLocaleString()}
            </span>
            <span className="ui-dash-stat-badge is-amber">
              <ThumbsUp size={10} strokeWidth={2.5} />
              <span>{positiveRate}%</span>
            </span>
          </div>

          <div className="ui-dash-stat-sub">Positive user responses</div>
        </div>
      </div>

      {/* 2. Unified Container: Filters + Table + Pagination */}
      <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* Toolbar with Filter Bar and Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-white">
          <div className="flex-1">
            <CommonFilterBar
              tabs={filterTabs}
              search={search}
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              searchPlaceholder={
                isDoctorView
                  ? 'Search doctor guides, schedules, policies...'
                  : isPatientView
                  ? 'Search patient FAQs, medications, tests...'
                  : 'Search articles, keywords, guidelines...'
              }
              dropdowns={filterDropdowns}
              onReset={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
              className="border-b-0"
            />
          </div>

          {isCreatable && (
            <div className="px-3.5 py-2 sm:py-0 shrink-0 flex items-center justify-end">
              <button
                type="button"
                onClick={handleOpenCreateDrawer}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Plus size={13} strokeWidth={2.4} />
                <span>
                  {isDoctorView ? 'New Doctor Article' : isPatientView ? 'New Patient Article' : 'New Article'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Common Table matching Doctors page layout */}
        <CommonTable
          columns={columns}
          data={paginatedArticles}
          loading={loading}
          onRowClick={(a) => handleOpenEditDrawer(a)}
          sort={sort}
          onSortChange={handleSortChange}
          rowActions={(article) => (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {isUpdatable && (
                <button
                  type="button"
                  onClick={() => handleOpenEditDrawer(article)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors shadow-2xs cursor-pointer"
                  title="Open in Drawer"
                >
                  <Pencil size={13} />
                </button>
              )}
              {isDeletable && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmArticle(article)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-colors shadow-2xs cursor-pointer"
                  title="Delete Article"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                <BookOpen size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {isDoctorView ? 'No doctor knowledge articles found' : isPatientView ? 'No patient knowledge articles found' : 'No knowledge articles found'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                {hasActiveFilters
                  ? 'No articles match your active filter criteria. Try resetting filters or adjusting search.'
                  : `Start building ${isDoctorView ? 'doctor' : isPatientView ? 'patient' : ''} clinical guidance and FAQ articles for AI assistant grounding.`}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Reset all filters
                </button>
              ) : isCreatable ? (
                <button
                  type="button"
                  onClick={handleOpenCreateDrawer}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-2xs"
                >
                  <Plus size={13} strokeWidth={2.4} />
                  <span>
                    {isDoctorView ? 'Create Doctor Article' : isPatientView ? 'Create Patient Article' : 'Create Article'}
                  </span>
                </button>
              ) : null}
            </div>
          }
        />

        {/* Common Pagination */}
        <CommonPagination
          total={totalCount}
          startIdx={startIdx}
          endIdx={endIdx}
          nounPlural="articles"
          page={page}
          pageCount={pageCount}
          perPage={limit}
          onPageChange={(p) => setPage(p)}
          onPerPageChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      </div>

      {/* 3. Common Drawer for Create / Edit Article (Replacing Center Modal) */}
      <Drawer
        open={drawerVisible}
        onClose={() => !submitting && setDrawerVisible(false)}
        label={
          isDoctorView
            ? 'DOCTOR SUPPORT KNOWLEDGE BASE'
            : isPatientView
            ? 'PATIENT SUPPORT KNOWLEDGE BASE'
            : 'SUPPORT KNOWLEDGE BASE'
        }
        title={
          editingArticle
            ? isDoctorView
              ? 'Edit Doctor Knowledge Article'
              : isPatientView
              ? 'Edit Patient Knowledge Article'
              : 'Edit Knowledge Article'
            : isDoctorView
            ? 'New Doctor Knowledge Article'
            : isPatientView
            ? 'New Patient Knowledge Article'
            : 'New Knowledge Article'
        }
        subtitle="Clinical guidelines, FAQs, and AI grounding text for patient and doctor assistance"
        icon={<BookOpen size={20} className="text-blue-600" />}
        size="lg"
        tags={
          editingArticle ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                tone={
                  editingArticle.status === 'PUBLISHED'
                    ? 'green'
                    : editingArticle.status === 'DRAFT'
                    ? 'amber'
                    : 'neutral'
                }
              >
                {editingArticle.status}
              </Badge>
              {editingArticle.is_faq && <Badge tone="violet">FAQ Card</Badge>}
              <Badge tone="blue">{formatCategory(editingArticle.category)}</Badge>
            </div>
          ) : undefined
        }
        stats={
          editingArticle
            ? [
                {
                  label: 'Helpful',
                  value: editingArticle.helpful_count || 0,
                  icon: <ThumbsUp size={12} className="text-emerald-500" />,
                },
                {
                  label: 'Unhelpful',
                  value: editingArticle.not_helpful_count || 0,
                  icon: <ThumbsDown size={12} className="text-rose-500" />,
                },
                {
                  label: 'Satisfaction',
                  value: `${
                    (editingArticle.helpful_count || 0) + (editingArticle.not_helpful_count || 0) > 0
                      ? Math.round(
                          ((editingArticle.helpful_count || 0) /
                            ((editingArticle.helpful_count || 0) + (editingArticle.not_helpful_count || 0))) *
                            100,
                        )
                      : 100
                  }%`,
                },
                {
                  label: 'Updated',
                  value: timeAgo(editingArticle.updated_at || editingArticle.created_at),
                },
              ]
            : undefined
        }
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <div>
              {editingArticle && isDeletable && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmArticle(editingArticle)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ui-btn ui-btn-subtle"
                onClick={() => setDrawerVisible(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="knowledge-article-drawer-form"
                className="ui-btn ui-btn-primary"
                disabled={submitting}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  borderColor: '#1d4ed8',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.28)',
                }}
              >
                {submitting ? 'Saving…' : editingArticle ? 'Update Article' : 'Save Article'}
              </button>
            </div>
          </div>
        }
      >
        <form
          id="knowledge-article-drawer-form"
          onSubmit={handleFormSubmit}
          className="p-4 space-y-4"
        >
          {/* Section 1: Article Identity & Target */}
          <DrawerSection title="Article Identity & Scope">
            <div className="space-y-3.5">
              <div>
                <label htmlFor="article-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Article Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="article-title-input"
                  type="text"
                  required
                  value={formValues.title}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={
                    isDoctorView
                      ? 'e.g. Doctor guidelines for emergency slot blocking & rescheduling'
                      : 'e.g. How to prepare for fasting blood sugar test & timings'
                  }
                  className="w-full h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Support Queue <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formValues.audience}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        audience: e.target.value as 'DOCTOR' | 'PATIENT' | 'ALL',
                      }))
                    }
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="DOCTOR">Doctor Support (Clinicians & Staff)</option>
                    <option value="PATIENT">Patient Support (Patients & Caretakers)</option>
                    <option value="ALL">All Support Queues (Universal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clinical Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formValues.category}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, category: e.target.value as TicketCategory }))
                    }
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs cursor-pointer"
                  >
                    {activeCategoryList.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formValues.status}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        status: e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
                      }))
                    }
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="PUBLISHED">Published (Active for AI &amp; Portal)</option>
                    <option value="DRAFT">Draft (Under Internal Review)</option>
                    <option value="ARCHIVED">Archived (Retired Article)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom URL Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={formValues.slug}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g. slot-blocking-guidelines"
                    className="w-full h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-mono"
                  />
                </div>
              </div>
            </div>
          </DrawerSection>

          {/* Section 2: Clinical Content & AI Grounding */}
          <DrawerSection title="Content & AI Grounding Guidelines">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Article Body &amp; Clinical Knowledge <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Grounding text for AI Chatbot</span>
              </div>
              <textarea
                rows={8}
                required
                value={formValues.content}
                onChange={(e) => setFormValues((prev) => ({ ...prev, content: e.target.value }))}
                placeholder={
                  isDoctorView
                    ? 'Provide clear, unambiguous clinical protocols, cancellation cut-offs, settlement schedules, or EHR guidelines. The AI assistant uses this exact reference to answer doctor inquiries.'
                    : 'Provide clear, easy-to-read instructions for patients regarding appointments, fasting requirements, prescription downloads, or clinic directions. Used directly by the AI chatbot.'
                }
                className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs resize-y leading-relaxed"
              />
            </div>
          </DrawerSection>

          {/* Section 3: Keywords & Quick FAQ Card */}
          <DrawerSection title="Search Indexing & Quick Cards">
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Search Keywords &amp; Aliases
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    placeholder="Type keyword and press Enter or click Add Tag..."
                    className="flex-1 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors shrink-0"
                  >
                    Add Tag
                  </button>
                </div>

                {formValues.keywords.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {formValues.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-medium"
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(kw)}
                          className="text-blue-500 hover:text-blue-800 cursor-pointer"
                          title="Remove tag"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl border border-purple-200/80 bg-purple-50/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-900 block flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-purple-600" />
                    <span>Promote to Quick FAQ Card</span>
                  </span>
                  <span className="text-[11px] text-purple-700 block mt-0.5">
                    {isDoctorView
                      ? 'Displays as a prominent quick-answer card in the Doctor Portal & App'
                      : 'Displays as a prominent quick-answer card in the Patient Support Center'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formValues.isFaq}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, isFaq: e.target.checked }))}
                  className="w-4.5 h-4.5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>
            </div>
          </DrawerSection>
        </form>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteConfirmArticle)}
        title="Delete Knowledge Article"
        message={
          deleteConfirmArticle
            ? `Are you sure you want to delete "${deleteConfirmArticle.title}"? The AI Assistant, doctors, and patients will no longer be able to reference this article.`
            : ''
        }
        confirmLabel="Delete Article"
        onConfirm={async () => {
          if (!deleteConfirmArticle) return;
          await handleDeleteArticle(deleteConfirmArticle.id);
          setDeleteConfirmArticle(null);
        }}
        onClose={() => setDeleteConfirmArticle(null)}
      />
    </div>
  );
};

export default KnowledgeBaseTab;
