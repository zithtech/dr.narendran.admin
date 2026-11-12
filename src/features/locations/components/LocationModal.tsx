import { Form, Input, Modal, Switch, message } from 'antd';
import { MapPin } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingLocation) {
        form.setFieldsValue({
          location_name: editingLocation.location_name,
          address: editingLocation.address || '',
          map_link: editingLocation.map_link || '',
          is_primary: Boolean(editingLocation.is_primary),
          status: editingLocation.status === 'Active',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          is_primary: false,
          status: true,
        });
      }
    }
  }, [open, editingLocation, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        location_name: values.location_name.trim(),
        address: values.address?.trim() || null,
        map_link: values.map_link?.trim() || null,
        is_primary: Boolean(values.is_primary),
        status: values.status ? 'Active' : 'Inactive',
      };

      let result: DoctorLocation;
      if (editingLocation) {
        result = await locationsApi.updateLocation(editingLocation.id, payload, doctorId);
        message.success(`Location "${result.location_name}" updated successfully`);
      } else {
        result = await locationsApi.createLocation(payload, doctorId);
        message.success(`Location "${result.location_name}" added successfully`);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return; // Antd validation error
      message.error(err?.response?.data?.error || err?.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText={editingLocation ? 'Save Changes' : 'Add Location'}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={20} className="text-primary-600" />
          <span>
            {editingLocation ? 'Edit Practice Location' : 'Add New Practice Location'}
            {doctorName ? ` – ${doctorName}` : ''}
          </span>
        </div>
      }
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="location_name"
          label="Location Name"
          rules={[
            { required: true, message: 'Location name is required' },
            {
              validator: (_, value) =>
                value && !value.trim()
                  ? Promise.reject(new Error('Location name cannot be blank'))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input placeholder="e.g. City Care Hospital or Main Clinic" maxLength={255} />
        </Form.Item>

        <Form.Item name="address" label="Address">
          <Input.TextArea
            rows={3}
            placeholder="Enter complete street address, landmark, city, postal code"
          />
        </Form.Item>

        <Form.Item name="map_link" label="Google Maps Link">
          <Input placeholder="https://maps.google.com/..." />
        </Form.Item>

        <div style={{ display: 'flex', gap: 32, marginTop: 8 }}>
          <Form.Item
            name="is_primary"
            label="Primary Location"
            valuePropName="checked"
            extra="Set this as the main clinic location"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="status"
            label="Active Status"
            valuePropName="checked"
            extra="Location is available for appointments"
          >
            <Switch />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
