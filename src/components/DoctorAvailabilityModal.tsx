import { CalendarX2, Pencil, Plus, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { titleCase } from '../lib/format';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Branch } from './BranchModal';
import { type Doctor } from './DoctorModal';
import { ConfirmDialog, Field, Modal } from './ui/Modal';
import { Alert, cx } from './ui/primitives';

interface AvailabilitySlot {
  id: string;
  doctor_id: string;
  branch_id: string;
  branch_name?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface DoctorAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
}

const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export default function DoctorAvailabilityModal({
  isOpen,
  onClose,
  doctor,
}: DoctorAvailabilityModalProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<AvailabilitySlot | null>(null);

  // Form states for new/edit slot
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [day, setDay] = useState('MONDAY');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [branchId, setBranchId] = useState<string>('');

  const fetchAvailability = useCallback(async () => {
    if (!doctor) return;
    setLoading(true);
    try {
      const response = await api.get(`doctor-availability/doctor/${doctor.id}`);
      setSlots(response.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch availability.'));
    } finally {
      setLoading(false);
    }
  }, [doctor]);

  const fetchBranches = useCallback(async () => {
    try {
      const response = await api.get('branches');
      setBranches(response.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const resetForm = useCallback(() => {
    setEditingSlotId(null);
    setDay('MONDAY');
    setStartTime('09:00');
    setEndTime('17:00');
    setBranchId(doctor?.branch_id || '');
    setError('');
  }, [doctor]);

  useEffect(() => {
    if (isOpen && doctor) {
      void fetchAvailability();
      void fetchBranches();
      resetForm();
    }
  }, [isOpen, doctor, fetchAvailability, fetchBranches, resetForm]);

  if (!isOpen || !doctor) return null;

  // Only allow selecting branches in the same hospital as the doctor
  const availableBranches = branches.filter((b) => b.hospital_id === doctor.hospital_id);

  const handleSubmitSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (branchId === '') {
      setError('Please select a branch for this schedule.');
      return;
    }
    if (endTime <= startTime) {
      setError('End time must be after the start time.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = editingSlotId ? `doctor-availability/${editingSlotId}` : 'doctor-availability';
      const method = editingSlotId ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          doctor_id: doctor.id,
          branch_id: branchId,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          status: 'ACTIVE',
        },
      });

      await fetchAvailability();
      resetForm();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save availability.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlot = (slot: AvailabilitySlot) => {
    setEditingSlotId(slot.id);
    setDay(slot.day_of_week);
    setStartTime(slot.start_time.slice(0, 5));
    setEndTime(slot.end_time.slice(0, 5));
    setBranchId(slot.branch_id);
    setError('');
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await api.delete(`doctor-availability/${id}`);
      if (editingSlotId === id) resetForm();
      await fetchAvailability();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete slot.'));
    } finally {
      setPendingDelete(null);
    }
  };

  const slotsByDay = DAYS.map((d) => ({
    day: d,
    slots: slots
      .filter((s) => s.day_of_week === d)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  })).filter((g) => g.slots.length > 0);

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        size="xl"
        title="Weekly schedule"
        description={`${doctor.name}${doctor.hospital_name ? ` · ${doctor.hospital_name}` : ''}`}
      >
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <span className="ui-section-title">
                {editingSlotId ? 'Edit time slot' : 'Add time slot'}
              </span>
              {editingSlotId && (
                <button type="button" onClick={resetForm} className="ui-btn ui-btn-sm ui-btn-ghost">
                  Cancel edit
                </button>
              )}
            </div>
            <form
              onSubmit={(e) => {
                void handleSubmitSlot(e);
              }}
              className={cx('ui-slot-form', editingSlotId && 'is-editing')}
            >
              <Field label="Day">
                <select className="ui-select" value={day} onChange={(e) => setDay(e.target.value)}>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {titleCase(d)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start">
                <input
                  className="ui-input"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </Field>
              <Field label="End">
                <input
                  className="ui-input"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </Field>
              <Field label="Branch">
                <select
                  className="ui-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button type="submit" disabled={loading} className="ui-btn ui-btn-primary">
                {editingSlotId ? (
                  'Update'
                ) : (
                  <>
                    <Plus size={15} /> Add
                  </>
                )}
              </button>
            </form>
          </div>

          <div>
            <div className="ui-section-title" style={{ marginBottom: 8 }}>
              Current availability · {slots.length} slot{slots.length === 1 ? '' : 's'}
            </div>
            {loading && slots.length === 0 ? (
              <div className="ui-week">
                {[0, 1, 2].map((i) => (
                  <div className="ui-week-row" key={i}>
                    <div className="ui-week-day">
                      <span className="ui-skeleton" style={{ width: 60 }} />
                    </div>
                    <div className="ui-week-slots">
                      <span className="ui-skeleton" style={{ width: 180, height: 20 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : slotsByDay.length === 0 ? (
              <div
                className="ui-table-empty"
                style={{
                  border: '1px dashed var(--ui-border-strong)',
                  borderRadius: 10,
                  padding: '36px 16px',
                }}
              >
                <div className="ui-table-empty-icon">
                  <CalendarX2 size={20} />
                </div>
                <strong>No availability scheduled</strong>
                <span>Add the first time slot above.</span>
              </div>
            ) : (
              <div className="ui-week">
                {slotsByDay.map((group) => (
                  <div className="ui-week-row" key={group.day}>
                    <div className="ui-week-day">{titleCase(group.day)}</div>
                    <div className="ui-week-slots">
                      {group.slots.map((slot) => (
                        <span
                          key={slot.id}
                          className={cx('ui-slot-chip', editingSlotId === slot.id && 'is-editing')}
                        >
                          <span className="ui-slot-chip-time">
                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          </span>
                          <span className="ui-slot-chip-branch">{slot.branch_name}</span>
                          <button
                            type="button"
                            className="ui-icon-btn"
                            onClick={() => handleEditSlot(slot)}
                            aria-label="Edit slot"
                            title="Edit slot"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="ui-icon-btn is-danger"
                            onClick={() => setPendingDelete(slot)}
                            aria-label="Remove slot"
                            title="Remove slot"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ui-modal-foot">
          <button type="button" onClick={onClose} className="ui-btn">
            Done
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove time slot?"
        confirmLabel="Remove"
        message={
          pendingDelete && (
            <>
              <strong>
                {titleCase(pendingDelete.day_of_week)} {pendingDelete.start_time.slice(0, 5)} –{' '}
                {pendingDelete.end_time.slice(0, 5)}
              </strong>{' '}
              at {pendingDelete.branch_name} will be removed from {doctor.name}&apos;s schedule.
            </>
          )
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={() => (pendingDelete ? handleDeleteSlot(pendingDelete.id) : undefined)}
      />
    </>
  );
}
