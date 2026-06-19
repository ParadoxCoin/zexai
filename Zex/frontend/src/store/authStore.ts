import { create } from 'zustand';
import { AuthState, User, LoginRequest, RegisterRequest, ChangePasswordRequest } from '@/types/auth';
import { AuthService } from '@/services/authService';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true });
    try {
      const authResponse = await AuthService.login(credentials);
      const user: User = {
        user_id: authResponse.user_id,
        email: authResponse.email,
        full_name: authResponse.full_name,
        role: authResponse.role as 'user' | 'admin' | 'super_admin' | 'moderator' | 'customer',
        package: authResponse.package as 'free' | 'starter' | 'pro' | 'enterprise',
        created_at: new Date().toISOString(),
        is_active: true,
        auth_provider: 'supabase',
        email_verified: false,
        two_factor_enabled: false,
      };

      set({
        user,
        token: authResponse.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true });
    try {
      const authResponse = await AuthService.register(data);
      const user: User = {
        user_id: authResponse.user_id,
        email: authResponse.email,
        full_name: authResponse.full_name,
        role: authResponse.role as 'user' | 'admin' | 'super_admin' | 'moderator' | 'customer',
        package: authResponse.package as 'free' | 'starter' | 'pro' | 'enterprise',
        created_at: new Date().toISOString(),
        is_active: true,
        auth_provider: 'supabase',
        email_verified: false,
        two_factor_enabled: false,
      };

      set({
        user,
        token: authResponse.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    AuthService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateProfile: async (data: Partial<User>) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    set({ isLoading: true });
    try {
      const updatedUser = await AuthService.updateProfile(data);
      set({
        user: { ...user, ...updatedUser },
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  changePassword: async (data: ChangePasswordRequest) => {
    set({ isLoading: true });
    try {
      await AuthService.changePassword(data);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));

// Initialize auth state from localStorage
const initializeAuth = () => {
  const token = AuthService.getStoredToken();
  const userData = AuthService.getStoredUser();

  if (token && userData) {
    const user: User = {
      user_id: userData.user_id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role as 'user' | 'admin' | 'super_admin' | 'moderator' | 'customer',
      package: userData.package as 'free' | 'starter' | 'pro' | 'enterprise',
      created_at: new Date().toISOString(),
      is_active: true,
      auth_provider: 'supabase',
      email_verified: false,
      two_factor_enabled: false,
    };

    useAuthStore.setState({
      user,
      token,
      isAuthenticated: true,
    });
  }
};

// Initialize on app start
initializeAuth();