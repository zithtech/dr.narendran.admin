import React, { useState } from 'react';

/**
 * Parses a qualification string (comma, slash, or semicolon separated) into clean tokens.
 */
export function parseQualifications(qual?: string | null): string[] {
  if (!qual || typeof qual !== 'string' || !qual.trim()) return [];
  return qual
    .split(/[,;/|]+/)
    .map((q) => q.trim())
    .filter(Boolean);
}

interface DoctorQualificationViewProps {
  qualification?: string | null | undefined;
  maxVisible?: number | undefined;
  className?: string | undefined;
}

/**
 * Enhanced Qualification UI for Doctor View (Drawer & Profile Page)
 * Displays qualifications cleanly as text without borders or backgrounds,
 * with clean spacing and an inline "+N more" expander when there are multiple degrees.
 */
export const DoctorQualificationView: React.FC<DoctorQualificationViewProps> = ({
  qualification,
  maxVisible = 3,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const quals = parseQualifications(qualification);

  if (quals.length === 0) {
    return (
      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 11.5 }}>
        {qualification || 'MBBS'}
      </span>
    );
  }

  const shouldCollapse = quals.length > maxVisible;
  const displayedQuals = shouldCollapse && !isExpanded ? quals.slice(0, maxVisible) : quals;
  const remainingCount = quals.length - maxVisible;

  return (
    <div
      className={`doctor-qual-val-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: '4px',
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: 600,
        color: '#1d4ed8',
        maxWidth: '220px',
        background: 'transparent',
        border: 'none',
      }}
      aria-label={qualification || undefined}
    >
      {/* Retain full string for screen readers only if truncated */}
      {shouldCollapse && !isExpanded && (
        <span className="sr-only">{qualification}</span>
      )}

      <span
        className="doctor-qual-text"
        title={quals.join(', ')}
        style={{
          color: '#1d4ed8',
          fontWeight: 600,
          background: 'transparent',
          border: 'none',
          wordBreak: 'break-word',
        }}
      >
        {displayedQuals.join(', ')}
      </span>

      {shouldCollapse && (
        <>
          {!isExpanded ? (
            <button
              type="button"
              className="doctor-qual-more-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              title={`Click to view all: ${quals.join(', ')}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563eb',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0 2px',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                lineHeight: 1.25,
              }}
            >
              +{remainingCount} more
            </button>
          ) : (
            <button
              type="button"
              className="doctor-qual-less-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              title="Collapse qualifications"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '0 2px',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                lineHeight: 1.25,
              }}
            >
              (less)
            </button>
          )}
        </>
      )}
    </div>
  );
};

interface DoctorQualificationTableProps {
  qualification?: string | null | undefined;
  maxVisible?: number | undefined;
  contact?: string | null | undefined;
}

/**
 * Enhanced Qualification UI for Doctor Tables
 * Renders primary qualifications with clean formatting and "..." for additional degrees, alongside contact.
 */
export const DoctorQualificationTable: React.FC<DoctorQualificationTableProps> = ({
  qualification,
  maxVisible = 2,
  contact,
}) => {
  const quals = parseQualifications(qualification);

  if (quals.length === 0 && !contact) {
    return <span className="ui-muted">No contact info</span>;
  }

  const visibleQuals = quals.slice(0, maxVisible);
  const hasMore = quals.length > maxVisible;

  return (
    <span className="inline-flex items-center gap-1.5 flex-nowrap max-w-full">
      {quals.length > 0 && (
        <span
          className="inline-flex items-center text-slate-700 font-medium truncate"
          title={quals.join(', ')}
        >
          <span className="sr-only">{qualification}</span>
          <span>{visibleQuals.join(', ')}</span>
          {hasMore && (
            <span
              className="text-slate-400 font-bold ml-0.5 select-none cursor-help"
              title={quals.join(', ')}
            >
              ...
            </span>
          )}
        </span>
      )}
      {contact && (
        <span className="text-slate-500 text-[11px] truncate">
          {quals.length > 0 && <span className="text-slate-300 mr-1.5">·</span>}
          {contact}
        </span>
      )}
    </span>
  );
};
