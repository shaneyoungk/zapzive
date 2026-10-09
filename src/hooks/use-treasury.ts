import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

// Get Assets
export function useAssets() {
    return useQuery({
        queryKey: ['treasury', 'assets'],
        queryFn: () => apiClient.getAssets(),
    });
}

// Get Portfolio
export function usePortfolio() {
    return useQuery({
        queryKey: ['treasury', 'portfolio'],
        queryFn: () => apiClient.getPortfolio(),
        staleTime: 30000,
    });
}

// Execute Swap
export function useSwap() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.executeSwap(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['treasury'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            toast.success('Swap executed successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to execute swap');
        },
    });
}

// Deposit
export function useDeposit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.deposit(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['treasury'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            toast.success('Deposit processed successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to process deposit');
        },
    });
}

// Withdraw
export function useWithdraw() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.withdraw(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['treasury'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            toast.success('Withdrawal initiated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to initiate withdrawal');
        },
    });
}
