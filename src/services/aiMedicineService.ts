import type { AIMedicineSuggestion, AISearchMedicineResponse } from '../types/pharmacy';
import api from '../utils/api';

/**
 * Searches and retrieves AI-assisted clinical medicine suggestions from the backend AI service.
 */
export async function searchMedicinesWithAi(query: string): Promise<AIMedicineSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const response = await api.post<AISearchMedicineResponse>('medicines/ai-search', {
    query: trimmed,
  });

  return response.data?.medicines ?? [];
}
