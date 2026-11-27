import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatAttachmentPreview } from '../components/ChatAttachmentPreview';
import { ChatConversationView } from '../components/ChatConversationView';
import { ChatImageLightboxModal } from '../components/ChatImageLightboxModal';
import { ChatMessageAttachment } from '../components/ChatMessageAttachment';
import type { ChatMessage, ChatRecipient, StagedAttachment } from '../types/chat';
import {
  formatFileSize,
  getFileCategory,
  isImageFile,
  validateAttachment,
} from '../utils/attachmentUtils';

// Mock scrollIntoView and URL object methods for jsdom
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  } else {
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
  }
});

// Mock dependencies for ChatConversationView
vi.mock('../../../context/PermissionContext', () => ({
  usePermission: () => ({
    effectiveRole: 'ADMIN',
    isAdmin: true,
    isDoctor: false,
    isPatient: false,
    canView: () => true,
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
  }),
}));

vi.mock('../api/chatApi', () => ({
  chatApi: {
    getMessages: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({
      id: 'msg-1',
      conversation_id: 'conv-1',
      message: 'Hello',
      sender_type: 'ADMIN',
      created_at: new Date().toISOString(),
    }),
    uploadAttachment: vi.fn().mockResolvedValue({
      id: 'msg-2',
      conversation_id: 'conv-1',
      message: 'Test Caption',
      sender_type: 'ADMIN',
      file_name: 'test.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      message_type: 'PDF',
      attachment_url: 'https://example.com/test.pdf',
      created_at: new Date().toISOString(),
    }),
    markAsRead: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../services/chatSocket', () => ({
  chatSocket: {
    connect: vi.fn(),
    joinConversation: vi.fn(),
    leaveConversation: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

describe('Chat Attachments - Utils', () => {
  it('formats file sizes accurately', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(15 * 1024 * 1024)).toBe('15.0 MB');
  });

  it('identifies file categories correctly', () => {
    expect(getFileCategory('photo.jpg', 'image/jpeg')).toBe('image');
    expect(getFileCategory('photo.png', 'image/png')).toBe('image');
    expect(getFileCategory('report.pdf', 'application/pdf')).toBe('pdf');
    expect(getFileCategory('doc.docx', 'application/msword')).toBe('document');
    expect(getFileCategory('data.xlsx', 'application/vnd.ms-excel')).toBe('spreadsheet');
    expect(getFileCategory('data.csv', 'text/csv')).toBe('spreadsheet');
    expect(getFileCategory('archive.zip', 'application/zip')).toBe('other');
  });

  it('validates file sizes and file extensions', () => {
    // Valid image
    const validImg = new File(['imagecontent'], 'avatar.png', { type: 'image/png' });
    expect(validateAttachment(validImg)).toEqual({ valid: true });

    // Valid pdf
    const validPdf = new File(['pdfcontent'], 'report.pdf', { type: 'application/pdf' });
    expect(validateAttachment(validPdf)).toEqual({ valid: true });

    // Valid spreadsheets
    const validCsv = new File(['col1,col2'], 'sheet.csv', { type: 'text/csv' });
    expect(validateAttachment(validCsv)).toEqual({ valid: true });

    const validXlsx = new File(['dummy'], 'data.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(validateAttachment(validXlsx)).toEqual({ valid: true });

    // Valid documents
    const validDocx = new File(['dummy'], 'notes.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(validateAttachment(validDocx)).toEqual({ valid: true });

    // Oversized file
    const oversizedFile = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(oversizedFile, 'size', { value: 16 * 1024 * 1024 });
    const sizeResult = validateAttachment(oversizedFile);
    expect(sizeResult.valid).toBe(false);
    expect(sizeResult.error).toContain('exceeds the 15 MB limit');

    // Unsupported extension
    const invalidExt = new File(['binary'], 'virus.exe', { type: 'application/x-msdownload' });
    const extResult = validateAttachment(invalidExt);
    expect(extResult.valid).toBe(false);
    expect(extResult.error).toContain('not supported');
  });

  it('identifies image files correctly', () => {
    expect(isImageFile('test.webp', 'image/webp')).toBe(true);
    expect(isImageFile('test.pdf', 'application/pdf')).toBe(false);
  });
});

describe('ChatAttachmentPreview Component', () => {
  const stagedItems: StagedAttachment[] = [
    {
      id: 'att-1',
      file: new File([''], 'scan.png', { type: 'image/png' }),
      name: 'scan.png',
      size: 1024,
      type: 'image/png',
      category: 'image',
      previewUrl: 'blob:scan-png',
    },
    {
      id: 'att-2',
      file: new File([''], 'lab-report.pdf', { type: 'application/pdf' }),
      name: 'lab-report.pdf',
      size: 2048,
      type: 'application/pdf',
      category: 'pdf',
    },
    {
      id: 'att-3',
      file: new File([''], 'metrics.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      name: 'metrics.xlsx',
      size: 4096,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      category: 'spreadsheet',
    },
  ];

  it('renders all staged attachment cards with name, category, and remove button', () => {
    const onRemove = vi.fn();
    const onAddMore = vi.fn();

    render(
      <ChatAttachmentPreview
        attachments={stagedItems}
        isUploading={false}
        onRemove={onRemove}
        onAddMore={onAddMore}
      />,
    );

    expect(screen.getByText('lab-report.pdf')).toBeInTheDocument();
    expect(screen.getByText('metrics.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Add more')).toBeInTheDocument();

    const removeScanBtn = screen.getByTitle('Remove scan.png');
    expect(removeScanBtn).toBeInTheDocument();

    fireEvent.click(removeScanBtn);
    expect(onRemove).toHaveBeenCalledWith('att-1');

    fireEvent.click(screen.getByText('Add more'));
    expect(onAddMore).toHaveBeenCalled();
  });

  it('shows uploading indicator when isUploading is true', () => {
    render(
      <ChatAttachmentPreview
        attachments={stagedItems}
        isUploading={true}
        onRemove={vi.fn()}
        onAddMore={vi.fn()}
      />,
    );

    expect(screen.getByText(/Uploading attachments\.\.\./i)).toBeInTheDocument();
  });
});

describe('ChatMessageAttachment Component', () => {
  it('renders image attachment and handles click to open lightbox', () => {
    const onOpenImage = vi.fn();
    const imageMessage: ChatMessage = {
      id: 'msg-img',
      conversation_id: 'conv-1',
      sender_id: 'doc-1',
      message: 'Check this X-ray',
      sender_type: 'DOCTOR',
      message_type: 'IMAGE',
      file_name: 'chest-xray.png',
      file_size: 204800,
      attachment_url: 'https://cdn.example.com/chest-xray.png',
      created_at: new Date().toISOString(),
    };

    render(
      <ChatMessageAttachment
        message={imageMessage}
        mine={false}
        onOpenImage={onOpenImage}
      />,
    );

    const img = screen.getByRole('img', { name: 'chest-xray.png' });
    expect(img).toBeInTheDocument();

    fireEvent.click(img);
    expect(onOpenImage).toHaveBeenCalledWith(
      'https://cdn.example.com/chest-xray.png',
      'chest-xray.png',
    );
  });

  it('renders document/spreadsheet attachment card with download button', () => {
    const docMessage: ChatMessage = {
      id: 'msg-doc',
      conversation_id: 'conv-1',
      sender_id: 'admin-1',
      message: 'Prescription PDF',
      sender_type: 'ADMIN',
      message_type: 'PDF',
      file_name: 'prescription.pdf',
      file_size: 1048576,
      attachment_url: 'https://cdn.example.com/prescription.pdf',
      created_at: new Date().toISOString(),
    };

    render(
      <ChatMessageAttachment
        message={docMessage}
        mine={true}
      />,
    );

    expect(screen.getByText('prescription.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();

    const downloadBtn = screen.getByTitle('Download prescription.pdf');
    expect(downloadBtn).toBeInTheDocument();
  });
});

describe('ChatImageLightboxModal Component', () => {
  it('renders full-screen image preview, download button, and responds to close/escape', () => {
    const onClose = vi.fn();

    const { unmount } = render(
      <ChatImageLightboxModal
        imageUrl="https://cdn.example.com/photo.jpg"
        fileName="photo.jpg"
        open={true}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'photo.jpg' });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/photo.jpg');

    const downloadBtn = screen.getByTitle('Download image');
    expect(downloadBtn).toBeInTheDocument();

    // Press escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();

    unmount();
  });
});

describe('ChatConversationView Attachment Integration', () => {
  const mockRecipient: ChatRecipient = {
    id: 'rec-1',
    name: 'Dr. Bharathi',
    role: 'DOCTOR',
    is_online: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders attachment (paperclip) button in toolbar', () => {
    render(
      <ChatConversationView
        conversationId="conv-1"
        recipient={mockRecipient}
        onBack={vi.fn()}
        onMessageSent={vi.fn()}
      />,
    );

    const paperclipBtn = screen.getByTitle('Attach files (images, documents, spreadsheets)');
    expect(paperclipBtn).toBeInTheDocument();
  });

  it('allows staging a file and enables Send button even without text message', async () => {
    render(
      <ChatConversationView
        conversationId="conv-1"
        recipient={mockRecipient}
        onBack={vi.fn()}
        onMessageSent={vi.fn()}
      />,
    );

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    expect(sendBtn).toBeDisabled();

    // Find file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const testFile = new File(['dummy test content'], 'lab_results.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Staged preview should now appear
    await waitFor(() => {
      expect(screen.getByText('lab_results.pdf')).toBeInTheDocument();
    });

    // Send button should now be enabled
    expect(sendBtn).not.toBeDisabled();
  });

  it('shows error banner when trying to attach invalid file', async () => {
    render(
      <ChatConversationView
        conversationId="conv-1"
        recipient={mockRecipient}
        onBack={vi.fn()}
        onMessageSent={vi.fn()}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['bad'], 'script.exe', { type: 'application/x-msdownload' });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/not supported/i)).toBeInTheDocument();
    });
  });
});
