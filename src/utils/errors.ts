import axios from 'axios';

interface ApiErrorBody {
  error?: unknown;
  message?: unknown;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const apiMessage = error.response?.data?.error ?? error.response?.data?.message;

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }

    return error.message || fallback;
  }

  return error instanceof Error && error.message ? error.message : fallback;
}
