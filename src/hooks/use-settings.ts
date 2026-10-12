import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { apiErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';

// Get Profile
export function useProfile() {
    return useQuery({
        queryKey: ['settings', 'profile'],
        queryFn: () => apiClient.getProfile(),
    });
}

// Update Profile
export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.updateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
            toast.success('Profile updated successfully');
        },
        onError: (error: any) => {
            toast.error(apiErrorMessage(error, 'Failed to update profile'));
        },
    });
}

export function useSetEnvironment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (mode: 'testnet' | 'live') => apiClient.setEnvironment(mode),
        onSuccess: (company) => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
            queryClient.invalidateQueries({ queryKey: ['crypto'] });
            queryClient.invalidateQueries({ queryKey: ['treasury'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success(company?.isTestMode ? 'Testnet mode enabled' : 'Live mode enabled');
        },
        onError: (error: any) => {
            toast.error(apiErrorMessage(error, 'Unable to change environment'));
        },
    });
}

// Get API Keys
export function useApiKeys() {
    return useQuery({
        queryKey: ['settings', 'api-keys'],
        queryFn: () => apiClient.getApiKeys(),
    });
}

// Generate API Key
export function useGenerateApiKey() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.generateApiKey(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] });
            toast.success('API key generated successfully');
        },
        onError: (error: any) => {
            toast.error(apiErrorMessage(error, 'Failed to generate API key'));
        },
    });
}

// Revoke API Key
export function useRevokeApiKey() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.revokeApiKey(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] });
            toast.success('API key revoked successfully');
        },
        onError: (error: any) => {
            toast.error(apiErrorMessage(error, 'Failed to revoke API key'));
        },
    });
}

// Get Webhooks
export function useWebhooks() {
    return useQuery({
        queryKey: ['settings', 'webhooks'],
        queryFn: () => apiClient.getWebhooks(),
    });
}

// Create Webhook
export function useCreateWebhook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.createWebhook(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'webhooks'] });
            toast.success('Webhook created successfully');
        },
        onError: (error: any) => {
            toast.error(apiErrorMessage(error, 'Failed to create webhook'));
        },
    });
}

// Update Webhook
export function useUpdateWebhook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.updateWebhook(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'webhooks'] });
            toast.success('Webhook updated successfully');
        },
        onError: (error: any) => {
            toast.error(apiErrorMessage(error, 'Failed to update webhook'));
        },
    });
}

// Delete Webhook
export function useDeleteWebhook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.deleteWebhook(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'webhooks'] });
            toast.success('Webhook deleted successfully');
        },
        onError: (error: any) => {
            toast.error(apiErrorMessage(error, 'Failed to delete webhook'));
        },
    });
}

// Get Usage Metrics
export function useUsageMetrics() {
    return useQuery({
        queryKey: ['settings', 'usage-metrics'],
        queryFn: () => apiClient.getUsageMetrics(),
    });
}

