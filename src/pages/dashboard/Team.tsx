import { Users } from "lucide-react";
import PageIntro from "@/components/dashboard/PageIntro";
import { EmptyState, ErrorNotice, Initials, LoadingRows, Panel } from "@/components/ops";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { usePayoutAction, useTeam } from "@/hooks/use-payouts";
import { payoutsApi } from "@/lib/payouts-api";
import { formatRelative } from "@/lib/format";

const LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", operator: "Operator", approver: "Approver", developer: "Developer" };

export default function Team() {
    const { user } = useAuth();
    const team = useTeam();
    const setRole = usePayoutAction(({ id, role }: { id: string; role: string }) => payoutsApi.setRole(id, role), { success: "Role updated", invalidate: [["team"]] });
    const isOwner = user?.role === "owner";
    const data = team.data;

    return (
        <div className="space-y-6">
            <PageIntro title="Team" description="Who can prepare, approve and configure payouts. Keep preparing and approving with different people where you can." />
            {team.isPending ? <div className="premium-card"><LoadingRows /></div> : team.isError || !data ? <div className="premium-card"><ErrorNotice error={team.error} onRetry={() => void team.refetch()} /></div> : (
                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <Panel title="Members" subtitle={`${data.members.length} member${data.members.length === 1 ? "" : "s"}`} id="members-title">
                        {data.members.length === 0 ? <EmptyState icon={Users} title="No members" /> : (
                            <ul className="divide-y divide-[#ece9e1]">
                                {data.members.map((member) => (
                                    <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                                        <Initials name={member.name} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[14px] font-semibold text-[#1b1c19]">{member.name}{member.id === data.viewerId && <span className="ml-1.5 text-xs font-normal text-[#8a897f]">(you)</span>}</p>
                                            <p className="truncate text-xs text-[#8a897f]">{member.email} · {member.lastLogin ? `last active ${formatRelative(member.lastLogin)}` : "never signed in"}</p>
                                        </div>
                                        {isOwner ? (
                                            <Select value={member.role} onValueChange={(role) => { if (role && role !== member.role) setRole.mutate({ id: member.id, role }); }}>
                                                <SelectTrigger className="h-9 w-36" aria-label={`Role for ${member.name}`}><SelectValue /></SelectTrigger>
                                                <SelectContent>{Object.keys(data.roles).map((role) => <SelectItem key={role} value={role}>{LABELS[role] ?? role}</SelectItem>)}</SelectContent>
                                            </Select>
                                        ) : <span className="rounded-full bg-[#f1efe9] px-2.5 py-1 text-xs font-semibold text-[#55544d]">{LABELS[member.role] ?? member.role}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="border-t border-[#ece9e1] px-5 py-3 text-[13px] text-[#74736b]">{data.invitations.reason}</div>
                    </Panel>
                    <Panel title="Roles" id="roles-title">
                        <dl className="divide-y divide-[#ece9e1] text-[13px]">
                            {Object.entries(data.roles).map(([role, description]) => <div key={role} className="px-5 py-3"><dt className="font-semibold text-[#1b1c19]">{LABELS[role] ?? role}</dt><dd className="mt-0.5 leading-5 text-[#74736b]">{description}</dd></div>)}
                        </dl>
                    </Panel>
                </div>
            )}
        </div>
    );
}
