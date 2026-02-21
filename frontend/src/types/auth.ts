export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin' | 'super_admin' | 'moderator' | 'customer';
  package: 'free' | 'starter' | 'pro' | 'enterprise' | 'basic';
  created_at: string;
  last_login?: string;
  is_active: boolean;
  auth_provider: 'jwt' | 'supabase';
  email_verified: boolean;
  two_factor_enabled: boolean;
}

export interface AuthResponse {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  package: string;
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
}