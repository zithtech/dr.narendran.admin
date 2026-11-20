import { Drawer } from 'antd';

import {
  ClinicalHistorySectionContent,
  type SectionTab,
} from './ClinicalHistorySectionContent';
import type { PatientMedicalHistoryRecord } from '../types/medicalHistory.types';

export interface RecordMedicalHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientGender?: string | null | undefined;
  patientName?: string | undefined;
  patientAge?: string | number | undefined;
  patientBloodGroup?: string | undefined;
  initialData?: PatientMedicalHistoryRecord | null | undefined;
  onSuccess: (saved: PatientMedicalHistoryRecord) => void;
}

export type RecordMedicalHistoryModalProps = RecordMedicalHistoryDrawerProps;

export function RecordMedicalHistoryDrawer({
  isOpen,
  onClose,
  patientId,
  patientGender,
  patientName,
  patientAge,
  patientBloodGroup,
  initialData,
  onSuccess,
}: RecordMedicalHistoryDrawerProps) {
  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      destroyOnClose
      width={1080}
      title={null}
      footer={null}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } }}
    >
      <ClinicalHistorySectionContent
        isOpen={isOpen}
        patientId={patientId}
        patientGender={patientGender}
        patientName={patientName}
        patientAge={patientAge}
        patientBloodGroup={patientBloodGroup}
        initialData={initialData}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Drawer>
  );
}

export const RecordMedicalHistoryModal = RecordMedicalHistoryDrawer;
export default RecordMedicalHistoryDrawer;
export type { SectionTab };
