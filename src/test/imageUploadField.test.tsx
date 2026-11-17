import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import api from '../utils/api';

vi.mock('../utils/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('ImageUploadField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-blob');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('renders correctly with default upload button and helper text', () => {
    render(
      <ImageUploadField
        id="test-upload"
        label="Doctor Photo"
        value=""
        onChange={vi.fn()}
        name="Dr. Smith"
      />
    );

    expect(screen.getByText('Doctor Photo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload Photo/i })).toBeInTheDocument();
    expect(screen.getByText(/Supports JPG, PNG, WEBP, GIF up to 10MB/i)).toBeInTheDocument();
  });

  it('renders "Change Photo" and "Remove" when an image value is provided', () => {
    const handleRemove = vi.fn();
    render(
      <ImageUploadField
        id="test-upload"
        label="Doctor Photo"
        value="https://example.com/avatar.jpg"
        onChange={handleRemove}
        name="Dr. Smith"
      />
    );

    expect(screen.getByRole('button', { name: /Change Photo/i })).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: /Remove/i });
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith('');
  });

  it('uploads a valid image and triggers onChange with returned URL', async () => {
    const handleChange = vi.fn();
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          url: 'https://s3.amazonaws.com/uploads/avatars/new-profile.jpg',
        },
      },
    });

    const { container } = render(
      <ImageUploadField
        id="test-upload"
        value=""
        onChange={handleChange}
        folder="doctor-profiles"
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const file = new File(['dummy content'], 'profile.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/upload/image',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
    });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/uploads/avatars/new-profile.jpg'
      );
    });
  });

  it('shows error if a file is not an image', async () => {
    const handleChange = vi.fn();
    const { container } = render(
      <ImageUploadField id="test-upload" value="" onChange={handleChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf data'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Please select a valid image file/i)
      ).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('toggles direct URL input when "Or paste URL" is clicked', () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadField
        id="test-upload"
        value=""
        onChange={handleChange}
      />
    );

    expect(screen.queryByPlaceholderText(/Direct image URL/i)).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /Or paste URL/i });
    fireEvent.click(toggleBtn);

    const urlInput = screen.getByPlaceholderText(/Direct image URL/i);
    expect(urlInput).toBeInTheDocument();

    fireEvent.change(urlInput, { target: { value: 'https://test.com/photo.jpg' } });
    expect(handleChange).toHaveBeenCalledWith('https://test.com/photo.jpg');
  });
});
