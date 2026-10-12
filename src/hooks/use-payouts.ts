import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api-client";
import { payoutsApi } from "@/lib/payouts-api";

/** Poll every 3s while anything in the response is processing, so delivery updates appear live. */
const whileProcessing = (data: unknown): number | false => (JSON.stringify(data ?? "").includes('"processing"') ? 3_000 : false);

export const usePayoutConfig = () => useQuery({ queryKey: ["payouts", "config"], queryFn: payoutsApi.config, staleTime: 5 * 60_000 });
export const useHome = () => useQuery({ queryKey: ["payouts", "home"], queryFn: payoutsApi.home, refetchInterval: 15_000 });
export const useRuns = (status?: string) => useQuery({ queryKey: ["payouts", "runs", status ?? "all"], queryFn: () => payoutsApi.runs(status), refetchInterval: (query) => whileProcessing(query.state.data) });
export const useRun = (id: string | undefined) => useQuery({ queryKey: ["payouts", "run", id], queryFn: () => payoutsApi.run(id!), enabled: Boolean(id), refetchInterval: (query) => whileProcessing(query.state.data) });
export const useMovements = (params: Parameters<typeof payoutsApi.movements>[0]) => useQuery({ queryKey: ["payouts", "movements", params], queryFn: () => payoutsApi.movements(params), refetchInterval: (query) => whileProcessing(query.state.data) });
export const useMovement = (id: string | undefined) => useQuery({ queryKey: ["payouts", "movement", id], queryFn: () => payoutsApi.movement(id!), enabled: Boolean(id), refetchInterval: (query) => whileProcessing(query.state.data) });
export const useApprovals = () => useQuery({ queryKey: ["payouts", "approvals"], queryFn: payoutsApi.approvals, refetchInterval: 20_000 });
export const useExceptions = () => useQuery({ queryKey: ["payouts", "exceptions"], queryFn: payoutsApi.exceptions, refetchInterval: 15_000 });
export const useReconciliation = () => useQuery({ queryKey: ["payouts", "reconciliation"], queryFn: payoutsApi.reconciliation, refetchInterval: (query) => whileProcessing(query.state.data) });
export const useReports = (params: Record<string, string | undefined>) => useQuery({ queryKey: ["payouts", "reports", params], queryFn: () => payoutsApi.reports(params) });
export const useActivity = (params: { entityType?: string; limit?: number }) => useQuery({ queryKey: ["payouts", "activity", params], queryFn: () => payoutsApi.activity(params) });
export const usePolicy = () => useQuery({ queryKey: ["payouts", "policy"], queryFn: payoutsApi.policy });
export const useFunding = () => useQuery({ queryKey: ["payouts", "funding"], queryFn: payoutsApi.funding });
export const useSampleStatus = () => useQuery({ queryKey: ["payouts", "sample"], queryFn: payoutsApi.sampleStatus });
export const useRecipients = (params: { q?: string; status?: string } = {}) => useQuery({ queryKey: ["recipients", params], queryFn: () => payoutsApi.recipients(params) });
export const useRecipient = (id: string | undefined) => useQuery({ queryKey: ["recipient", id], queryFn: () => payoutsApi.recipient(id!), enabled: Boolean(id) });
export const useTeam = () => useQuery({ queryKey: ["team"], queryFn: payoutsApi.team });

/**
 * A mutation that refreshes every payout read model on success and reports
 * errors with the server's message. Money-changing calls carry an
 * Idempotency-Key from the shared API client.
 */
export function usePayoutAction<TVariables, TResult = unknown>(fn: (variables: TVariables) => Promise<TResult>, options: { success?: string | ((result: TResult) => string); invalidate?: QueryKey[] } = {}) {
    const queryClient = useQueryClient();
    const refresh = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payouts"] }),
        queryClient.invalidateQueries({ queryKey: ["recipients"] }),
        queryClient.invalidateQueries({ queryKey: ["recipient"] }),
        ...(options.invalidate ?? []).map((key) => queryClient.invalidateQueries({ queryKey: key })),
    ]);
    return useMutation({
        mutationFn: fn,
        onSuccess: async (result) => {
            await refresh();
            const message = typeof options.success === "function" ? options.success(result) : options.success;
            if (message) toast.success(message);
        },
        onError: async (error) => {
            const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
            // Whatever failed, show the true current state rather than a stale screen.
            await refresh();
            if (code === "RUN_CHANGED" || code === "PAYOUT_CHANGED") toast.error(`${apiErrorMessage(error)} The page has been refreshed.`);
            else toast.error(apiErrorMessage(error));
        },
    });
}
