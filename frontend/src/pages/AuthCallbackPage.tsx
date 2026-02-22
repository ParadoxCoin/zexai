import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check for error parameters in URL (Supabase sends errors as query params)
                const urlError = searchParams.get('error');
                const errorDescription = searchParams.get('error_description');
                const errorCode = searchParams.get('error_code');

                if (urlError) {
                    console.error('OAuth error from Supabase:', { urlError, errorCode, errorDescription });
                    throw new Error(
                        errorDescription ||
                        `OAuth hatası: ${urlError}${errorCode ? ` (${errorCode})` : ''}`
                    );
                }

                // Also check for errors in URL hash (some flows use hash fragments)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const hashError = hashParams.get('error');
                const hashErrorDescription = hashParams.get('error_description');

                if (hashError) {
                    console.error('OAuth hash error:', { hashError, hashErrorDescription });
                    throw new Error(hashErrorDescription || `OAuth hatası: ${hashError}`);
                }

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
                setTimeout(() => navigate('/login', { replace: true }), 5000);
            }
        };

        handleCallback();
    }, [navigate, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
                <div className="text-center max-w-md px-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="text-2xl">❌</span>
                    </div>
                    <p className="text-red-400 text-lg font-medium mb-2">Giriş Hatası</p>
                    <p className="text-gray-500 text-sm mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/login', { replace: true })}
                        className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
                    >
                        Giriş Sayfasına Dön
                    </button>
                    <p className="text-gray-600 text-xs mt-3">5 saniye içinde otomatik yönlendirileceksiniz...</p>
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
