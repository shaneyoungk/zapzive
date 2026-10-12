import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIntro from "@/components/dashboard/PageIntro";
import { EmptyState, ErrorNotice, LoadingRows, Panel, Timeline } from "@/components/ops";
import { payoutsApi } from "@/lib/payouts-api";

const FILTERS = [["", "All"], ["payout_run", "Payout runs"], ["movement", "Payouts"], ["recipient", "Recipients"], ["approval_policy", "Policy"], ["user", "Team"]] as const;

export default function Activity() {
    const [entityType, setEntityType] = useState("");
    const feed = useInfiniteQuery({
        queryKey: ["payouts", "activity-feed", entityType],
        queryFn: ({ pageParam }) => payoutsApi.activity({ entityType: entityType || undefined, cursor: pageParam, limit: 50 }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (page) => page.nextCursor ?? undefined,
    });
    const events = feed.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <div className="space-y-6">
            <PageIntro title="Activity" description="One audit trail across payout runs, payouts, recipients, approvals and settings. Every entry records who acted, when, and the request ID." />
            <Panel title="Audit trail" id="audit-feed" actions={
                <div className="dash-seg max-w-full overflow-x-auto" role="group" aria-label="Filter activity">
                    {FILTERS.map(([value, label]) => <button key={value} aria-pressed={entityType === value} onClick={() => setEntityType(value)}>{label}</button>)}
                </div>
            }>
                {feed.isPending ? <LoadingRows rows={6} /> : feed.isError ? <ErrorNotice error={feed.error} onRetry={() => void feed.refetch()} /> : events.length === 0 ? <EmptyState icon={History} title="No activity yet">Actions on payout runs, recipients and settings will be recorded here.</EmptyState> : (
                    <>
                        <Timeline events={events} />
                        {feed.hasNextPage && <div className="border-t border-[#ece9e1] p-4 text-center"><Button variant="outline" size="sm" onClick={() => void feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>{feed.isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Load older activity</Button></div>}
                    </>
                )}
            </Panel>
        </div>
    );
}
