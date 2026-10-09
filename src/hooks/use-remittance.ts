import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

// Get Remittances
export function useRemittances(params?: { status?: string; search?: string }) {
    return useQuery({
        queryKey: ['remittances', params],
        queryFn: () => apiClient.getRemittances(params),
    });
}

// Get Single Remittance
export function useRemittance(id: string) {
    return useQuery({
        queryKey: ['remittances', id],
        queryFn: () => apiClient.getRemittance(id),
        enabled: !!id,
    });
}

// Create Remittance
export function useCreateRemittance() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.createRemittance(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['remittances'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success('Remittance created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create remittance');
        },
    });
}

// Cancel Remittance
export function useCancelRemittance() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.cancelRemittance(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['remittances'] });
            toast.success('Remittance cancelled');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to cancel remittance');
        },
    });
}

// Get Recipients
export function useRecipients() {
    return useQuery({
        queryKey: ['recipients'],
        queryFn: () => apiClient.getRecipients(),
    });
}

// Add Recipient
export function useAddRecipient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.addRecipient(data),
        onSuccess: (recipient) => {
            // The wizard selects this recipient immediately after saving. Put
            // the server response in the cache first so step two cannot race a
            // background refetch and lose the selected payout destination.
            queryClient.setQueryData(['recipients'], (current: unknown) => {
                const rows = Array.isArray(current) ? current : [];
                return [recipient, ...rows.filter((row: any) => row?.id !== recipient?.id)];
            });
            void queryClient.invalidateQueries({ queryKey: ['recipients'] });
            toast.success('Recipient added successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to add recipient');
        },
    });
}
