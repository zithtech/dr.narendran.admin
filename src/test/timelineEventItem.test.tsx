import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TimelineEventItem } from '../features/timelines/components/TimelineEventItem';
import type { TimelineEvent } from '../features/timelines/types/patientTimelines';

describe('TimelineEventItem Compact Card & Expand/Collapse', () => {
  const samplePrescriptionEvent: TimelineEvent = {
    id: 'evt-101',
    type: 'PRESCRIPTION',
    title: 'Prescription',
    summary: 'Seasonal Allergies & Common Cold',
    occurred_at: '2026-10-29T05:30:00Z',
    doctor: {
      id: 'doc-01',
      name: 'Dr. Bharathi',
      specialization: 'Haematology',
    },
    details: {
      diagnosis: 'Seasonal Rhinitis',
      medicines: [
        {
          name: 'Paracetamol',
          dosage: '500mg',
          frequency: '1-0-1',
          duration: '3 days',
          instructions: 'After food',
        },
        {
          name: 'Cetirizine',
          dosage: '10mg',
          frequency: '0-0-1',
          duration: '5 days',
          instructions: 'Night only',
        },
      ],
      consultation_notes: 'Patient advised to stay hydrated and rest.',
    },
  };

  it('renders compact 2-column layout with event info on left and medicine count & View Details on right', () => {
    render(<TimelineEventItem event={samplePrescriptionEvent} isLast={false} />);

    // Left section: Title & Summary
    expect(screen.getAllByText('Prescription')).toHaveLength(2);
    expect(screen.getByText('Seasonal Allergies & Common Cold')).toBeInTheDocument();
    expect(screen.getByText('Seasonal Rhinitis')).toBeInTheDocument();

    // Right section: Medicine count indicator
    expect(screen.getByText('2 medicines prescribed')).toBeInTheDocument();

    // Right section: View Details trigger
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();

    // Details should be collapsed initially
    expect(screen.queryByText('Patient advised to stay hydrated and rest.')).not.toBeInTheDocument();
  });

  it('expands clinical details when clicking the timeline card', () => {
    render(<TimelineEventItem event={samplePrescriptionEvent} isLast={false} />);

    const card = screen.getByRole('button', { name: /prescription timeline event/i });
    expect(card).toHaveAttribute('aria-expanded', 'false');

    // Click the card
    fireEvent.click(card);

    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
    expect(screen.getByText('Patient advised to stay hydrated and rest.')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('Cetirizine')).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.queryByText('Patient advised to stay hydrated and rest.')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation (Enter and Space) on the card', () => {
    render(<TimelineEventItem event={samplePrescriptionEvent} isLast={false} />);

    const card = screen.getByRole('button', { name: /prescription timeline event/i });

    // Press Enter to expand
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hide Details')).toBeInTheDocument();

    // Press Space to collapse
    fireEvent.keyDown(card, { key: ' ' });
    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('does not collapse when clicking inside the expanded details area', () => {
    render(<TimelineEventItem event={samplePrescriptionEvent} isLast={false} />);

    const card = screen.getByRole('button', { name: /prescription timeline event/i });
    fireEvent.click(card);

    expect(card).toHaveAttribute('aria-expanded', 'true');

    // Click inside the notes
    const notes = screen.getByText('Patient advised to stay hydrated and rest.');
    fireEvent.click(notes);

    // Card should remain expanded
    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
  });

  it('toggles expansion when clicking the View Details button directly', () => {
    render(<TimelineEventItem event={samplePrescriptionEvent} isLast={false} />);

    const viewDetailsBtn = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(viewDetailsBtn);

    const card = screen.getByRole('button', { name: /prescription timeline event/i });
    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hide Details')).toBeInTheDocument();

    const hideDetailsBtn = screen.getByRole('button', { name: /hide details/i });
    fireEvent.click(hideDetailsBtn);

    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });
});
