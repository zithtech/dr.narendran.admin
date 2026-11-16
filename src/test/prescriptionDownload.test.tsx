import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Prescription, prescriptionsApi } from '../features/prescriptions/api/prescriptionsApi';
import ViewPrescriptionModal from '../features/prescriptions/components/ViewPrescriptionModal';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => {
  const fn = vi.fn();
  (fn as unknown as { get: ReturnType<typeof vi.fn> }).get = vi.fn();
  (fn as unknown as { post: ReturnType<typeof vi.fn> }).post = vi.fn();
  (fn as unknown as { put: ReturnType<typeof vi.fn> }).put = vi.fn();
  (fn as unknown as { delete: ReturnType<typeof vi.fn> }).delete = vi.fn();
  return { default: fn };
});

describe('Prescription PDF Same-Tab Direct Download', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('downloads the PDF blob via an anchor element without calling window.open', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const createObjectUrlSpy = vi
      .spyOn(window.URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost:5173/rx-blob-1');
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    vi.mocked(api.get).mockResolvedValueOnce({
      data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
      headers: {
        'content-disposition': 'attachment; filename="Prescription_RX123.pdf"',
      },
    });

    await prescriptionsApi.downloadPdf('rx-12345678');

    expect(api.get).toHaveBeenCalledWith('/prescriptions/rx-12345678/pdf', {
      responseType: 'blob',
    });
    expect(openSpy).not.toHaveBeenCalled();
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);

    const anchorArg = appendSpy.mock.calls.find(
      (args) => args[0] instanceof HTMLAnchorElement,
    )?.[0] as HTMLAnchorElement | undefined;
    expect(anchorArg).toBeDefined();
    expect(anchorArg?.download).toBe('Prescription_RX123.pdf');
    expect(anchorArg?.target).not.toBe('_blank');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers same-tab download when clicking Download PDF in ViewPrescriptionModal', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const downloadSpy = vi.spyOn(prescriptionsApi, 'downloadPdf').mockResolvedValueOnce();

    const sampleRx: Prescription = {
      id: 'rx-98765432-0000-0000-0000-000000000001',
      patient_id: 'pat-1',
      prescription_date: '2026-11-12',
      status: 'active',
      patient_name: 'Manivannan',
      doctor: {
        id: 'doc-1',
        name: 'Dr. Bharathi',
      },
      medicines_count: 0,
      medicines: [],
      lab_tests: [],
      created_at: '2026-11-12T10:00:00.000Z',
    };

    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: sampleRx } });

    renderWithProviders(
      <ViewPrescriptionModal prescription={sampleRx} open={true} onClose={vi.fn()} />,
    );

    const btn = await screen.findByRole('button', { name: /Download PDF/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith(sampleRx.id);
    });
    expect(openSpy).not.toHaveBeenCalled();
  });
});

