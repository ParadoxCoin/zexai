import { supabase } from '@/lib/supabase';
import { AuthResponse, LoginRequest, RegisterRequest, ChangePasswordRequest, User } from '@/types/auth';

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;
    if (!data.user || !data.session) throw new Error('No user data returned');

    return this.getUserProfile(data.user, data.session.access_token);
  }

  static async register(data: RegisterRequest): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
        },
      },
    });

    if (error) throw error;
    if (!authData.user) throw new Error('Registration successful but no user data returned');

    // If email confirmation is enabled, session might be null
    const token = authData.session?.access_token || '';

    return this.getUserProfile(authData.user, token);
  }

  static async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  static async getCurrentUser(): Promise<User> {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) throw new Error('No user logged in');

    const authResponse = await this.getUserProfile(user, '');
    return authResponse; // AuthResponse includes User fields
  }

  static async updateProfile(data: Partial<User>): Promise<User> {
    const updates: any = {};
    if (data.full_name) updates.data = { full_name: data.full_name };
    if (data.email) updates.email = data.email;

    const { data: { user }, error } = await supabase.auth.updateUser(updates);

    if (error) throw error;
    if (!user) throw new Error('Update failed');

    // Also update public.users if needed via API or Supabase client
    if (Object.keys(data).length > 0) {
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          // Add other fields as needed
        })
        .eq('id', user.id);

      if (profileError) console.error("Failed to update public profile:", profileError);
    }

    const authResponse = await this.getUserProfile(user, '');
    return authResponse;
  }

  static async changePassword(data: ChangePasswordRequest): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: data.new_password
    });

    if (error) throw error;
  }

  static getStoredToken(): string | null {
    // Check auth_token first (kept in sync by api.ts)
    const authToken = localStorage.getItem('auth_token');
    if (authToken && authToken !== 'null' && authToken !== 'undefined') {
      return authToken;
    }
    // Check Supabase internal key patterns
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          if (data?.access_token) return data.access_token;
        } catch { /* skip */ }
      }
    }
    return null;
  }

  static async getStoredTokenAsync(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token);
        return data.session.access_token;
      }
    } catch (e) {
      console.warn('getStoredTokenAsync failed:', e);
    }
    return this.getStoredToken();
  }

  static getStoredUser(): AuthResponse | null {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  static isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  // Helper to fetch full user profile including role from public table
  private static async getUserProfile(sbUser: any, token: string): Promise<AuthResponse> {
    // Fetch profile from public.users to get the real role
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', sbUser.id)
      .single();

    if (error) {
      console.warn('Failed to fetch user profile, falling back to metadata:', error);
    }

    const user: User = {
      user_id: sbUser.id,
      email: sbUser.email || '',
      full_name: profile?.full_name || sbUser.user_metadata?.full_name || '',
      role: profile?.role || sbUser.user_metadata?.role || 'user',
      package: profile?.package || sbUser.user_metadata?.package || 'free',
      created_at: sbUser.created_at,
      is_active: true,
      auth_provider: 'supabase',
      email_verified: !!sbUser.email_confirmed_at,
      two_factor_enabled: false,
    };

    const response = {
      access_token: token,
      token_type: 'bearer',
      ...user
    };

    // Update local storage
    if (token) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(response));
    }

    return response;
  }
}