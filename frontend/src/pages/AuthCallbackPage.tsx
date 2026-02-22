import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

/**
 * OAuth callback handler.
 * After social login (Google/GitHub/Discord), Supabase redirects here.
 * We extract the session and redirect to dashboard.
 */
const AuthCallbackPage = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get session from URL hash (Supabase puts tokens in URL fragment)
                const { data, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    throw sessionError;
                }

                if (data?.session) {
                    const user = data.session.user;
                    const token = data.session.access_token;

                    // Store in localStorage for our app
                    localStorage.setItem('auth_token', token);
                    localStorage.setItem('user_data', JSON.stringify({
                        user_id: user.id,
                        email: user.email,
                        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
                        role: 'user',
                        package: 'free',
                    }));

                    // Update Zustand store
                    useAuthStore.setState({
                        user: {
                            user_id: user.id,
                            email: user.email || '',
                            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
                            role: 'user',
                            package: 'free',
                            created_at: user.created_at || new Date().toISOString(),
                            is_active: true,
                            auth_provider: (user.app_metadata?.provider || 'supabase') as 'jwt' | 'supabase',
                            email_verified: !!user.email_confirmed_at,
                            two_factor_enabled: false,
                        },
                        token,
                        isAuthenticated: true,
                    });

                    // Try to sync with backend (ensure user exists in our DB)
                    try {
                        const { apiService } = await import('@/services/api');
                        await apiService.post('/auth/sync-oauth', {
                            supabase_user_id: user.id,
                            email: user.email,
                            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                            provider: user.app_metadata?.provider || 'unknown',
                            avatar_url: user.user_metadata?.avatar_url || '',
                        });
                    } catch {
                        // Non-critical: backend sync can fail silently
                        console.warn('Backend sync skipped (endpoint may not exist yet)');
                    }

                    navigate('/dashboard', { replace: true });
                } else {
                    throw new Error('Oturum alınamadı. Lütfen tekrar deneyin.');
                }
            } catch (err: any) {
                console.error('OAuth callback error:', err);
                setError(err.message || 'Giriş sırasında bir hata oluştu');
                setTimeout(() => navigate('/login', { replace: true }), 3000);
            }
        };

        handleCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="text-2xl">❌</span>
                    </div>
                    <p className="text-red-400 text-lg font-medium mb-2">Giriş Hatası</p>
                    <p className="text-gray-500 text-sm">{error}</p>
                    <p className="text-gray-600 text-xs mt-3">Login sayfasına yönlendiriliyorsunuz...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                <p className="text-white text-lg font-medium">Giriş yapılıyor...</p>
                <p className="text-gray-500 text-sm mt-1">Lütfen bekleyin</p>
            </div>
        </div>
    );
};

export default AuthCallbackPage;
