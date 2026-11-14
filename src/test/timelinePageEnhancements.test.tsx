import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TimelineFilterBar } from '../features/timelines/components/TimelineFilterBar';
import { TimelineHealthSummary } from '../features/timelines/components/TimelineHealthSummary';
import type { HealthSummaryData } from '../features/timelines/types/patientTimelines';

describe('Timeline Health Summary & Filter Bar Enhancements', () => {
  const sampleSummary: HealthSummaryData = {
    primary_condition: 'Seasonal Allergies & Common Cold',
    current_medicines_count: 3,
    active_medications: ['Paracetamol', 'Cetirizine', 'Montelukast'],
    recent_consultation_date: '2026-10-29',
    upcoming_followup_date: '2026-11-20',
    consultations_count: 2,
    prescriptions_count: 5,
    investigations_count: 4,
    medical_records_count: 3,
  };

  it('renders compact health summary with 4 clinical metric columns and aggregation footnote', () => {
    render(<TimelineHealthSummary summary={sampleSummary} />);

    // Header & badge
    expect(screen.getByText('Health Summary & Active Care')).toBeInTheDocument();
    expect(screen.getByText('Active Care Program')).toBeInTheDocument();

    // 4 metric sections
    expect(screen.getByText('Primary Condition')).toBeInTheDocument();
    expect(screen.getByText('Seasonal Allergies & Common Cold')).toBeInTheDocument();

    expect(screen.getByText('Current Medicines')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('active medications')).toBeInTheDocument();

    expect(screen.getByText('Recent Consultation')).toBeInTheDocument();
    expect(screen.getByText('2026-10-29')).toBeInTheDocument();

    expect(screen.getByText('Upcoming Follow-up')).toBeInTheDocument();
    expect(screen.getByText('2026-11-20')).toBeInTheDocument();

    // Footnote counters
    expect(screen.getByText('2 Consultations')).toBeInTheDocument();
    expect(screen.getByText('5 Prescriptions')).toBeInTheDocument();
    expect(screen.getByText('4 Investigations')).toBeInTheDocument();
    expect(screen.getByText('3 Medical Records')).toBeInTheDocument();
    expect(screen.getByText('Dynamic Clinical Aggregation')).toBeInTheDocument();
  });

  it('renders compact filter bar with event categories and period options', () => {
    const handleSelectType = vi.fn();
    const handleSelectYear = vi.fn();
    const handleDateRangeChange = vi.fn();

    render(
      <TimelineFilterBar
        selectedType="All"
        onSelectType={handleSelectType}
        selectedYear="All"
        onSelectYear={handleSelectYear}
        dateRange={null}
        onDateRangeChange={handleDateRangeChange}
        totalEvents={10}
      />,
    );

    // Header & event counter
    expect(screen.getByText('Filter by Event Category')).toBeInTheDocument();
    expect(screen.getByText('10 events found')).toBeInTheDocument();

    // Category pills
    expect(screen.getByRole('button', { name: /all events/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /consultations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /medicines/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /prescriptions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /investigations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lab reports/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /records/i })).toBeInTheDocument();

    // Period buttons
    expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2025' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument();

    // Click Category
    fireEvent.click(screen.getByRole('button', { name: /prescriptions/i }));
    expect(handleSelectType).toHaveBeenCalledWith('Prescriptions');

    // Click Year
    fireEvent.click(screen.getByRole('button', { name: '2026' }));
    expect(handleSelectYear).toHaveBeenCalledWith('2026');
  });
});
