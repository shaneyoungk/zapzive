import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import apiClient, { AUTH_SESSION_INVALID_EVENT, AUTH_STORAGE_KEY } from '@/lib/api-client';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role?: string;
    status?: string;
    companyId?: string;
}

export interface AuthCompany {
    id: string;
    name: string;
    email?: string;
    country?: string;
    isTestMode?: boolean;
    status?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    company: AuthCompany | null;
    token: string | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
    login: (data: { user: AuthUser; company: AuthCompany; token?: string }) => void;
    signup: (data: { user: AuthUser; company: AuthCompany; token?: string }) => void;
    logout: () => void;
    updateCompany: (data: AuthCompany) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearStoredAuth() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('company');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
}

function persistAuth(data: { user: AuthUser; company: AuthCompany; token?: string }) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, data.token || 'cookie');
    sessionStorage.setItem('user', JSON.stringify(data.user));
    sessionStorage.setItem('company', JSON.stringify(data.company));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [company, setCompany] = useState<AuthCompany | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);
    const authChannel = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        let cancelled = false;
        let hasStoredSession = false;

        try {
            const storedToken = sessionStorage.getItem(AUTH_STORAGE_KEY);
            const storedUser = sessionStorage.getItem('user');
            const storedCompany = sessionStorage.getItem('company');
            if (storedToken && storedUser && storedCompany) {
                hasStoredSession = true;
                setToken(storedToken);
                setUser(JSON.parse(storedUser) as AuthUser);
                setCompany(JSON.parse(storedCompany) as AuthCompany);

                // Revalidate the session on boot. The short-lived bearer token
                // is used when the dashboard and API are on separate origins;
                // the HttpOnly cookie remains a secure same-site fallback.
                void apiClient.getSession()
                    .then((session) => {
                        if (cancelled) return;
                        setUser(session.user as AuthUser);
                        setCompany(session.company as AuthCompany);
                        persistAuth({ user: session.user, company: session.company, token: storedToken });
                    })
                    .catch((error: unknown) => {
                        if (cancelled) return;
                        // Only an explicitly rejected session signs the user out. A rate
                        // limit, server error or network blip keeps the stored session;
                        // the next authenticated request revalidates it.
                        const status = (error as { response?: { status?: number } })?.response?.status;
                        if (status !== 401 && status !== 403) return;
                        clearStoredAuth();
                        setToken(null);
                        setUser(null);
                        setCompany(null);
                    })
                    .finally(() => {
                        if (!cancelled) setIsHydrated(true);
                    });
            } else {
                clearStoredAuth();
            }
        } catch {
            clearStoredAuth();
            setToken(null);
            setUser(null);
            setCompany(null);
            setIsHydrated(true);
        } finally {
            if (!hasStoredSession) setIsHydrated(true);
        }

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const channel = new BroadcastChannel('zapzive-auth');
        authChannel.current = channel;
        channel.onmessage = (event) => {
            if (event.data?.type === 'logout') {
                setUser(null);
                setCompany(null);
                setToken(null);
                clearStoredAuth();
            }
        };
        return () => {
            channel.close();
            authChannel.current = null;
        };
    }, []);

    useEffect(() => {
        const handleInvalidSession = () => {
            // React state, rather than an axios-level page reload, controls the
            // protected-route transition. This avoids racing a just-completed
            // sign-in while still removing a genuinely expired or revoked session.
            clearStoredAuth();
            setToken(null);
            setUser(null);
            setCompany(null);
        };

        window.addEventListener(AUTH_SESSION_INVALID_EVENT, handleInvalidSession);
        return () => window.removeEventListener(AUTH_SESSION_INVALID_EVENT, handleInvalidSession);
    }, []);

    const login = (data: { user: AuthUser; company: AuthCompany; token?: string }) => {
        setUser(data.user);
        setCompany(data.company);
        const sessionToken = data.token || 'cookie';
        setToken(sessionToken);
        persistAuth({ ...data, token: sessionToken });
    };

    const logout = () => {
        setUser(null);
        setCompany(null);
        setToken(null);
        clearStoredAuth();
        authChannel.current?.postMessage({ type: 'logout' });
    };

    const updateCompany = (data: AuthCompany) => {
        setCompany(data);
        sessionStorage.setItem('company', JSON.stringify(data));
    };

    const value = useMemo(() => ({
        user,
        company,
        token,
        isAuthenticated: Boolean(token && user && company),
        isHydrated,
        login,
        signup: login,
        logout,
        updateCompany,
    }), [user, company, token, isHydrated]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
