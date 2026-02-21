export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CreditBalance {
  user_id: string;
  credits_balance: number;
  updated_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  service_type: string;
  credits_used: number;
  timestamp: string;
  details?: Record<string, any>;
}

export interface MediaOutput {
  id: string;
  user_id: string;
  service_type: 'chat' | 'image' | 'video' | 'audio';
  file_url?: string;
  file_type?: string;
  file_size?: number;
  metadata?: Record<string, any>;
  created_at: string;
  is_showcase: boolean;
}

export interface ServiceCost {
  service_type: string;
  model_name: string;
  cost_per_unit: number;
  unit_type: string;
  is_active: boolean;
}