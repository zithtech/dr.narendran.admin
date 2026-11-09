import {
  Check,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';
import React, {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string | undefined;
  badge?: string | undefined;
  badgeTone?: 'neutral' | 'green' | 'blue' | 'red' | 'amber' | 'violet' | undefined;
  icon?: ReactNode | undefined;
  disabled?: boolean | undefined;
  extraSearchTerms?: string[] | undefined;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  searchPlaceholder?: string | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  id?: string | undefined;
  name?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  variant?: 'default' | 'pill' | undefined;
  searchable?: boolean | undefined;
  clearable?: boolean | undefined;
  onClear?: (() => void) | undefined;
  emptyText?: string | undefined;
  width?: string | number | undefined;
  menuWidth?: 'trigger' | 'auto' | string | number | undefined;
  menuAlign?: 'left' | 'right' | undefined;
  isSet?: boolean | undefined;
  'aria-label'?: string | undefined;
  renderOption?: ((option: SearchableSelectOption) => ReactNode) | undefined;
  renderSelected?: ((option: SearchableSelectOption | undefined) => ReactNode) | undefined;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search options...',
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  style,
  size = 'md',
  variant = 'default',
  searchable,
  clearable = false,
  onClear,
  emptyText = 'No options found',
  width,
  menuWidth,
  menuAlign = 'left',
  isSet,
  'aria-label': ariaLabel,
  renderOption,
  renderSelected,
}: SearchableSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Whether search input should be visible in dropdown
  const showSearch = searchable !== undefined ? searchable : options.length > 3;

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchLabel = opt.label.toLowerCase().includes(q);
    const matchSublabel = opt.sublabel?.toLowerCase().includes(q);
    const matchValue = opt.value.toLowerCase().includes(q);
    const matchBadge = opt.badge?.toLowerCase().includes(q);
    const matchExtra = opt.extraSearchTerms?.some((t) => t.toLowerCase().includes(q));
    return matchLabel || matchSublabel || matchValue || matchBadge || Boolean(matchExtra);
  });

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      if (showSearch) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 30);
        return () => clearTimeout(timer);
      }
    } else {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen, showSearch]);

  // Scroll highlighted item into view
  const scrollItemIntoView = (index: number) => {
    if (listRef.current && listRef.current.children[index]) {
      const child = listRef.current.children[index] as HTMLElement;
      child.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1 >= filteredOptions.length ? 0 : prev + 1;
        scrollItemIntoView(next);
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev - 1 < 0 ? Math.max(0, filteredOptions.length - 1) : prev - 1;
        scrollItemIntoView(next);
        return next;
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const opt = filteredOptions[highlightedIndex];
        if (opt && !opt.disabled) {
          onChange(opt.value);
          setIsOpen(false);
          setSearchQuery('');
        }
      } else if (filteredOptions.length === 1 && !filteredOptions[0]?.disabled) {
        onChange(filteredOptions[0]!.value);
        setIsOpen(false);
        setSearchQuery('');
      } else if (selectedOption && !searchQuery) {
        setIsOpen(false);
      }
    }
  };

  const handleSelectOption = (opt: SearchableSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  // Dimensions by size
  const heightPx = size === 'sm' ? 32 : size === 'lg' ? 44 : 38;
  const fontSizePx = size === 'sm' ? 12.5 : size === 'lg' ? 14 : 13;
  const isPill = variant === 'pill';
  const pillIsActive = isSet !== undefined ? isSet : Boolean(value && value !== '' && value !== 'all');

  // Compute menu style
  const computedMenuWidth = (() => {
    if (menuWidth === 'trigger') return '100%';
    if (typeof menuWidth === 'number' || typeof menuWidth === 'string') return menuWidth;
    if (isPill) return 'max-content';
    return '100%';
  })();

  const computedMinWidth = isPill ? 180 : '100%';
  const computedMaxWidth = 'min(380px, 95vw)';

  return (
    <div
      ref={containerRef}
      className={`ui-searchable-select-wrap ${className}`}
      style={{
        position: 'relative',
        display: isPill ? 'inline-block' : 'block',
        width: width || (isPill ? 'auto' : '100%'),
        fontFamily: 'inherit',
        ...style,
      }}
      onKeyDown={handleKeyDown}
    >
      <style>{`
        .ui-searchable-select-wrap {
          user-select: none;
        }
        .ui-searchable-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          outline: none;
          box-sizing: border-box;
        }
        .ui-searchable-trigger.variant-default {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #1e293b;
        }
        .ui-searchable-trigger.variant-default:hover:not(:disabled) {
          border-color: #cbd5e1;
          background: #fafafa;
        }
        .ui-searchable-trigger.variant-default.is-open {
          border-color: #7c3aed !important;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
          background: #ffffff;
        }
        .ui-searchable-trigger.variant-default:focus-visible {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
        }
        .ui-searchable-trigger.variant-pill {
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
        }
        .ui-searchable-trigger.variant-pill:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .ui-searchable-trigger.variant-pill.is-active {
          background: #f5f3ff;
          border-color: #ddd6fe;
          color: #6d28d9;
          font-weight: 600;
        }
        .ui-searchable-trigger.variant-pill.is-active:hover:not(:disabled) {
          background: #ede9fe;
          border-color: #c4b5fd;
        }
        .ui-searchable-trigger.variant-pill.is-open {
          border-color: #7c3aed !important;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
        }
        .ui-searchable-trigger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f8fafc;
        }
        .ui-searchable-menu {
          position: absolute;
          top: calc(100% + 4px);
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
          z-index: 99999;
          overflow: hidden;
          animation: uiSearchableMenuFade 0.14s ease-out;
        }
        @keyframes uiSearchableMenuFade {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .ui-searchable-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .ui-searchable-search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 12px;
          color: #0f172a;
          outline: none;
          padding: 0;
        }
        .ui-searchable-search-input::placeholder {
          color: #94a3b8;
        }
        .ui-searchable-options-list {
          max-height: 220px;
          overflow-y: auto;
          padding: 4px;
        }
        .ui-searchable-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 10px;
          border-radius: 6px;
          font-size: 12.5px;
          color: #334155;
          cursor: pointer;
          transition: all 0.12s ease;
          gap: 8px;
        }
        .ui-searchable-option:hover:not(.is-disabled) {
          background: #f5f3ff;
          color: #7c3aed;
        }
        .ui-searchable-option.is-selected {
          background: #f5f3ff;
          color: #6d28d9;
          font-weight: 600;
        }
        .ui-searchable-option.is-highlighted {
          background: #f5f3ff;
          color: #7c3aed;
        }
        .ui-searchable-option.is-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      {/* Hidden Native Select for standard accessibility and automated test compatibility */}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-label={ariaLabel}
        required={required}
        disabled={disabled}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          height: 0,
          width: 0,
          margin: 0,
          padding: 0,
          border: 0,
          overflow: 'hidden',
        }}
      >
        {!options.some((opt) => opt.value === '') && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label} {opt.sublabel ? `(${opt.sublabel})` : ''}
          </option>
        ))}
      </select>

      {/* Visible Interactive Trigger */}
      <button
        type="button"
        className={`ui-searchable-trigger ${isPill ? 'variant-pill' : 'variant-default'} ${isOpen ? 'is-open' : ''} ${pillIsActive ? 'is-active' : ''}`}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          width: '100%',
          height: heightPx,
          padding: isPill
            ? size === 'sm' ? '0 12px' : '0 14px'
            : size === 'sm' ? '0 8px' : '0 12px',
          fontSize: fontSizePx,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {renderSelected ? (
            renderSelected(selectedOption)
          ) : selectedOption ? (
            <>
              {selectedOption.icon && (
                <span style={{ display: 'inline-flex', flexShrink: 0, color: pillIsActive ? '#7c3aed' : '#64748b' }}>
                  {selectedOption.icon}
                </span>
              )}
              <span
                style={{
                  fontWeight: pillIsActive ? 600 : 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: isPill ? (pillIsActive ? '#6d28d9' : '#475569') : '#0f172a',
                }}
              >
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>
                  · {selectedOption.sublabel}
                </span>
              )}
              {selectedOption.badge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 9999,
                    background: '#f5f3ff',
                    color: '#6d28d9',
                    border: '1px solid #ddd6fe',
                    flexShrink: 0,
                  }}
                >
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span style={{ color: '#94a3b8', fontStyle: 'normal' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 6 }}>
          {clearable && selectedOption && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              title="Clear selection"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.background = '#fef2f2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={13}
            style={{
              color: isOpen ? '#7c3aed' : pillIsActive ? '#7c3aed' : '#94a3b8',
              transition: 'transform 0.18s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div
          className="ui-searchable-menu"
          role="listbox"
          style={{
            left: menuAlign === 'left' ? 0 : 'auto',
            right: menuAlign === 'right' ? 0 : 'auto',
            width: computedMenuWidth,
            minWidth: computedMinWidth,
            maxWidth: computedMaxWidth,
          }}
        >
          {/* Search Box Header */}
          {showSearch && (
            <div className="ui-searchable-search-box">
              <Search size={13} style={{ color: '#7c3aed', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                className="ui-searchable-search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                  title="Clear filter text"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Options Scroll List */}
          <div ref={listRef} className="ui-searchable-options-list">
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '12px 14px',
                  textAlign: 'center',
                  fontSize: 12,
                  color: '#64748b',
                }}
              >
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                if (renderOption) {
                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleSelectOption(opt)}
                      role="option"
                      aria-selected={isSelected}
                      className={`ui-searchable-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''} ${opt.disabled ? 'is-disabled' : ''}`}
                    >
                      {renderOption(opt)}
                    </div>
                  );
                }

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelectOption(opt)}
                    role="option"
                    aria-selected={isSelected}
                    className={`ui-searchable-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''} ${opt.disabled ? 'is-disabled' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                      {opt.icon && (
                        <span style={{ display: 'inline-flex', flexShrink: 0, color: isSelected ? '#7c3aed' : '#64748b' }}>
                          {opt.icon}
                        </span>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? '#6d28d9' : '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: 9999,
                            background: opt.badgeTone === 'green' ? '#f0fdf4' : opt.badgeTone === 'amber' ? '#fffbeb' : '#f5f3ff',
                            color: opt.badgeTone === 'green' ? '#16a34a' : opt.badgeTone === 'amber' ? '#d97706' : '#6d28d9',
                            border: `1px solid ${opt.badgeTone === 'green' ? '#bbf7d0' : opt.badgeTone === 'amber' ? '#fde68a' : '#ddd6fe'}`,
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={14} style={{ color: '#7c3aed' }} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
