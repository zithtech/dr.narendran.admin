import { App } from 'antd';
import { Loader2, MapPin } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Field, Modal, Section, SwitchRow } from '../../../components/ui/Modal';
import { Alert } from '../../../components/ui/primitives';
import { locationsApi } from '../services/locationsApi';
import type { DoctorLocation } from '../types/locations';

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (loc: DoctorLocation) => void;
  editingLocation?: DoctorLocation | null | undefined;
  doctorId?: string | undefined; // provided in Admin mode
  doctorName?: string | undefined;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingLocation = null,
  doctorId,
  doctorName,
}) => {
  const { message } = App.useApp();
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editingLocation) {
        setLocationName(editingLocation.location_name || '');
        setAddress(editingLocation.address || '');
        setMapLink(editingLocation.map_link || '');
        setIsPrimary(Boolean(editingLocation.is_primary));
        setIsActive(editingLocation.status === 'Active');
      } else {
        setLocationName('');
        setAddress('');
        setMapLink('');
        setIsPrimary(false);
        setIsActive(true);
      }
      setError(null);
    }
  }, [open, editingLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim()) {
      setError('Location / Clinic name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        location_name: locationName.trim(),
        address: address.trim() || null,
        map_link: mapLink.trim() || null,
        is_primary: Boolean(isPrimary),
        status: isActive ? 'Active' : 'Inactive',
      };

      let result: DoctorLocation;
      if (editingLocation) {
        result = await locationsApi.updateLocation(editingLocation.id, payload, doctorId);
        void message.success(`Location "${result.location_name}" updated successfully`);
      } else {
        result = await locationsApi.createLocation(payload, doctorId);
        void message.success(`Location "${result.location_name}" added successfully`);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save location';
      setError(msg);
      void message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      variant="drawer"
      size="md"
      title={
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-blue-600" />
          <span>{editingLocation ? 'Edit Practice Location' : 'Add New Practice Location'}</span>
        </div>
      }
      description={
        doctorName
          ? `Practicing doctor: ${doctorName}`
          : 'Configure consultation chamber and clinical address.'
      }
    >
      <form onSubmit={handleSubmit} className="ui-modal-form">
        <div className="ui-modal-body space-y-4">
          {error && <Alert>{error}</Alert>}

          <Section title="Location Identification">
            <div className="space-y-3">
              <Field
                label="Location / Clinic Name"
                required
                hint="e.g. City Care Hospital, Apollo Consultation Chamber, Main Clinic"
              >
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Enter location or chamber name..."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  maxLength={255}
                  required
                />
              </Field>

              <Field
                label="Complete Practice Address"
                hint="Street address, landmark, floor/chamber number, city, postal code"
              >
                <textarea
                  rows={3}
                  className="ui-textarea"
                  placeholder="Enter full address details..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>

              <Field
                label="Google Maps URL"
                hint="Direct map link for patient route navigation"
              >
                <input
                  type="url"
                  className="ui-input"
                  placeholder="https://maps.google.com/..."
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Settings & Availability">
            <div className="space-y-3">
              <SwitchRow
                checked={isPrimary}
                onChange={setIsPrimary}
                title="Primary Practice Location"
                description="Designate this clinic or chamber as the doctor's primary practice base."
              />

              <SwitchRow
                checked={isActive}
                onChange={setIsActive}
                title="Active Status"
                description="Make this location visible and available for patient consultations."
              />
            </div>
          </Section>
        </div>

        <div className="ui-modal-foot">
          <button
            type="button"
            className="ui-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{editingLocation ? 'Save Changes' : 'Add Location'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
