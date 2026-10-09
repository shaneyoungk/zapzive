import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';

interface SignupData {
    email: string;
    name: string;
    password: string;
    companyName: string;
    country: string;
}

interface LoginData {
    email: string;
    password: string;
}

interface OnboardingData {
    companyId: string;
    phone: string;
    address: string;
    businessType: string;
    monthlyVolume: string;
}

// Signup
export function useSignup() {
    const navigate = useNavigate();
    const { signup } = useAuth();

    return useMutation({
        mutationFn: async (data: SignupData) => {
            return apiClient.signup(data);
        },
        onSuccess: (data) => {
            signup(data);
            toast.success('Account created successfully!');
            navigate('/dashboard'); // Skip email verification for demo
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create account');
        },
    });
}

// Login
export function useLogin() {
    const navigate = useNavigate();
    const { login } = useAuth();

    return useMutation({
        mutationFn: async (data: LoginData) => {
            return apiClient.login(data);
        },
        onSuccess: (data) => {
            login(data);
            toast.success('Welcome back!');
            // Navigation handled in the component to support "from" redirection
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Login failed');
        },
    });
}

// Verify Email
export function useVerifyEmail() {
    return useMutation({
        mutationFn: async (email: string) => {
            return apiClient.verifyEmail(email);
        },
        onSuccess: (data) => {
            toast.success('Verification code sent to your email');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to send verification code');
        },
    });
}

// Complete Onboarding
export function useCompleteOnboarding() {
    const navigate = useNavigate();
    const { updateCompany } = useAuth();

    return useMutation({
        mutationFn: async (data: OnboardingData) => {
            return apiClient.completeOnboarding(data);
        },
        onSuccess: (data) => {
            updateCompany(data);
            toast.success('Onboarding completed!');
            navigate('/dashboard');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to complete onboarding');
        },
    });
}

// Logout
export function useLogout() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { logout } = useAuth();

    return async () => {
        try {
            await apiClient.logout();
        } catch {
            // Local cleanup must still happen if the network is unavailable.
        }
        logout();
        queryClient.clear();
        toast.success('Logged out successfully');
        navigate('/login');
    };
}

// Get current user
export function useCurrentUser() {
    const { user } = useAuth();
    return user;
}

// Get current company
export function useCurrentCompany() {
    const { company } = useAuth();
    return company;
}

// Check if authenticated
export function useIsAuthenticated() {
    const { isAuthenticated } = useAuth();
    return isAuthenticated;
}

