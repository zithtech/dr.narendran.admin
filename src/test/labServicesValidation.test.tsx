import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LabServiceModal, {
  validateLabServiceName,
} from '../components/LabServiceModal';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => {
  const fn = vi.fn();
  (fn as any).get = vi.fn();
  (fn as any).post = vi.fn();
  (fn as any).put = vi.fn();
  (fn as any).delete = vi.fn();
  return { default: fn };
});

describe('Lab Services Validation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateLabServiceName unit logic', () => {
    it('returns error when name is empty or only whitespace', () => {
      expect(validateLabServiceName('')).toBe('Diagnostic service name is required.');
      expect(validateLabServiceName('   ')).toBe('Diagnostic service name is required.');
    });

    it('returns error when name is fewer than 2 characters', () => {
      expect(validateLabServiceName('A')).toBe(
        'Diagnostic service name must be at least 2 characters.',
      );
    });

    it('returns error when name exceeds 150 characters', () => {
      expect(validateLabServiceName('A'.repeat(151))).toBe(
        'Diagnostic service name cannot exceed 150 characters.',
      );
    });

    it('returns error when name contains invalid characters', () => {
      expect(validateLabServiceName('CBC #Special')).toBe(
        'Diagnostic service name contains invalid characters.',
      );
      expect(validateLabServiceName('Test $Package')).toBe(
        'Diagnostic service name contains invalid characters.',
      );
      expect(validateLabServiceName('Test @Clinic')).toBe(
        'Diagnostic service name contains invalid characters.',
      );
      expect(validateLabServiceName('Test ^Power')).toBe(
        'Diagnostic service name contains invalid characters.',
      );
      expect(validateLabServiceName('Test {Curlys}')).toBe(
        'Diagnostic service name contains invalid characters.',
      );
    });

    it('returns undefined for valid test names with clinical punctuation', () => {
      const validNames = [
        'Complete Blood Count (CBC)',
        'HbA1c / Glycated Hemoglobin',
        'Lipid Profile',
        'COVID-19 RT-PCR',
        'Vitamin D3 (25-OH)',
        'Blood Group & Rh Type (ABO/Rh+)',
        'Liver Function Test (LFT) / Bilirubin',
        "Ziehl-Neelsen's Staining",
        'Serum Protein Electrophoresis (SPEP %)',
      ];

      for (const name of validNames) {
        expect(validateLabServiceName(name), `Expected "${name}" to be valid`).toBeUndefined();
      }
    });
  });

  describe('LabServiceModal Real-time Sanitization & Drawer Form Validation', () => {
    it('sanitizes input on typing by stripping disallowed characters', () => {
      renderWithProviders(
        <LabServiceModal isOpen={true} onClose={vi.fn()} service={null} onSave={vi.fn()} />,
      );

      const input = screen.getByLabelText(
        /Diagnostic Service \/ Test Name/i,
      ) as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Lipid @#$ Profile ^' } });
      expect(input.value).toBe('Lipid  Profile ');
    });

    it('shows inline validation error when field is blurred while empty', () => {
      renderWithProviders(
        <LabServiceModal isOpen={true} onClose={vi.fn()} service={null} onSave={vi.fn()} />,
      );

      const input = screen.getByLabelText(
        /Diagnostic Service \/ Test Name/i,
      ) as HTMLInputElement;

      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(screen.getByText('Diagnostic service name is required.')).toBeInTheDocument();
      expect(input).toHaveClass('has-error');
    });

    it('clears inline validation error once a valid service name is typed', () => {
      renderWithProviders(
        <LabServiceModal isOpen={true} onClose={vi.fn()} service={null} onSave={vi.fn()} />,
      );

      const input = screen.getByLabelText(
        /Diagnostic Service \/ Test Name/i,
      ) as HTMLInputElement;

      fireEvent.focus(input);
      fireEvent.blur(input);
      expect(screen.getByText('Diagnostic service name is required.')).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'Thyroid Profile (T3, T4, TSH)' } });
      expect(screen.queryByText('Diagnostic service name is required.')).not.toBeInTheDocument();
      expect(input).not.toHaveClass('has-error');
    });

    it('prevents submission and highlights invalid input when submitted empty', async () => {
      const handleSave = vi.fn();
      renderWithProviders(
        <LabServiceModal isOpen={true} onClose={vi.fn()} service={null} onSave={handleSave} />,
      );

      const submitBtn = screen.getByRole('button', { name: /Create Diagnostic Service/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Diagnostic service name is required.')).toBeInTheDocument();
      expect(api).not.toHaveBeenCalled();
      expect(handleSave).not.toHaveBeenCalled();
    });

    it('submits successfully when valid service data is provided', async () => {
      vi.mocked(api).mockResolvedValue({ data: { success: true } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <LabServiceModal
          isOpen={true}
          onClose={handleClose}
          service={null}
          onSave={handleSave}
        />,
      );

      const input = screen.getByLabelText(/Diagnostic Service \/ Test Name/i);
      fireEvent.change(input, { target: { value: 'HbA1c Glycated Hemoglobin' } });

      const submitBtn = screen.getByRole('button', { name: /Create Diagnostic Service/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            url: 'lab-services',
            data: {
              name: 'HbA1c Glycated Hemoglobin',
              status: 'ACTIVE',
            },
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
