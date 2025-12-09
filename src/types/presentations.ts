/**
 * Presentation Types
 */

export interface Presentation {
  id: number;
  category: string;
  custom_label: string | null;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePresentationParams {
  category: string;
  custom_label?: string | null;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string | null;
  uploaded_by?: string | null;
}

export interface UpdatePresentationParams {
  category?: string;
  custom_label?: string | null;
}

