import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleDashed, FlaskConical } from "lucide-react";
import PageIntro from "@/components/dashboard/PageIntro";
import { NetworkIcon } from "@/components/dashboard/AssetIcon";
import { Panel, ToneBadge } from "@/components/ops";
import LegacySettings from "@/pages/dashboard/Settings";
import { useAuth } from "@/contexts/AuthContext";
import { usePayoutConfig } from "@/hooks/use-payouts";
import { useCryptoReadiness } from "@/hooks/useCryptoRails";
import { METHOD_LABELS } from "@/lib/payout-format";

const TABS = [["providers", "Providers"], ["api", "API keys"], ["webhooks", "Webhooks"], ["diagnostics", "Diagnostics"]] as const;

/** Planned categories only; no partner names are implied until a real integration exists. */
const PLANNED = [
    ["Bank and PSP payouts", "Licensed bank or payment-service provider for local transfers"],
    ["Mobile money", "M-Pesa and other mobile wallets through a licensed aggregator"],
    ["Stablecoin settlement", "Optional USDC settlement through a regulated partner"],
    ["Accounting", "Journal exports today; QuickBooks and Xero sync later"],
];

function Providers() {
    const config = usePayoutConfig();
    return (
        <div className="space-y-5">
            <Panel title="Connected" id="connected-title"><p className="p-5 text-[13px] text-[#74736b]">No live providers are connected. Live execution requires a contract with a licensed provider.</p></Panel>
            <Panel title="Available in sandbox" id="sandbox-title">
                <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6f1] text-primary"><FlaskConical className="h-5 w-5" /></span>
                            <div><p className="text-[14px] font-semibold text-[#1b1c19]">Zapzive sandbox provider</p><p className="text-[13px] text-[#74736b]">Simulated execution with sandbox quotes, fees and references (SBX-…). Settles on the server in seconds.</p></div>
                        </div>
                        <ToneBadge tone="positive">Active</ToneBadge>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-[13px] font-semibold text-[#1b1c19]">Methods</p>
                            <p className="mt-1 text-[13px] text-[#55544d]">{(config.data?.methods ?? []).map((item) => METHOD_LABELS[item.id] ?? item.label).join(", ")}</p>
                            <p className="mt-3 text-[13px] font-semibold text-[#1b1c19]">Corridors</p>
                            <ul className="mt-1 space-y-0.5 text-[13px] text-[#55544d]">{(config.data?.corridors ?? []).map((item) => <li key={item.country}>{item.name}: {item.currencies.map((cur) => `${cur.currency} (${cur.methods.map((m) => METHOD_LABELS[m]).join(", ")})`).join("; ")}</li>)}</ul>
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-[#1b1c19]">Reproducible sandbox outcomes</p>
                            <ul className="mt-1 divide-y divide-[#ece9e1] rounded-xl border border-[#ece9e1] text-[13px]">{(config.data?.sandboxOutcomes ?? []).map((item) => <li key={item.trigger} className="px-3 py-2"><span className="font-medium text-[#1b1c19]">{item.trigger}</span><span className="block text-[#74736b]">{item.outcome}</span></li>)}</ul>
                        </div>
                    </div>
                </div>
            </Panel>
            <Panel title="Planned" subtitle="Integration directions, not partnerships" id="planned-title">
                <ul className="divide-y divide-[#ece9e1]">{PLANNED.map(([name, description]) => <li key={name} className="flex items-start gap-3 px-5 py-3 text-[13px]"><CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[#9a998f]" /><span><span className="font-medium text-[#1b1c19]">{name}</span><span className="block text-[#74736b]">{description}</span></span></li>)}</ul>
            </Panel>
        </div>
    );
}

function Diagnostics() {
    const { company } = useAuth();
    const readiness = useCryptoReadiness(company?.id || "", company?.isTestMode === false ? "live" : "testnet");
    return (
        <Panel title="Settlement lab diagnostics" subtitle="Technical health of the experimental on-chain settlement lab. These do not block sandbox payouts." id="diag-title">
            {readiness.isPending ? <p className="p-5 text-[13px] text-[#74736b]">Checking networks…</p> : !readiness.data?.rails.length ? <p className="p-5 text-[13px] text-[#74736b]">No settlement networks configured.</p> : (
                <ul className="divide-y divide-[#ece9e1]">
                    {readiness.data.rails.map((rail) => (
                        <li key={rail.key} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                            <NetworkIcon network={rail.chainId} size="sm" />
                            <span className="min-w-0 flex-1"><span className="font-medium text-[#1b1c19]">{rail.name}</span><span className="block truncate text-xs text-[#8a897f]">{rail.ready ? `Block ${Number(rail.primaryBlock ?? 0).toLocaleString()} · ${rail.secondaryBlock ? "2 RPC providers" : "single RPC provider"}` : rail.reason}</span></span>
                            {rail.ready ? <ToneBadge tone="positive"><CheckCircle2 className="h-3 w-3" /> Online</ToneBadge> : <ToneBadge tone="neutral">Offline</ToneBadge>}
                        </li>
                    ))}
                </ul>
            )}
            <p className="border-t border-[#ece9e1] px-5 py-3 text-xs text-[#8a897f]">Open the <Link to="/dashboard/crypto" className="font-semibold text-primary hover:underline">settlement lab</Link> to test wallet-signed USDC transfers.</p>
        </Panel>
    );
}

export default function Integrations() {
    const [params, setParams] = useSearchParams();
    const tab = (TABS.find(([value]) => value === params.get("tab"))?.[0] ?? "providers") as (typeof TABS)[number][0];
    return (
        <div className="space-y-6">
            <PageIntro title="Integrations" description="Execution providers, API access, webhooks and technical diagnostics." />
            <div className="flex gap-6 overflow-x-auto border-b border-[#e3e0d7] text-[14px]" role="tablist" aria-label="Integration sections">
                {TABS.map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setParams(value === "providers" ? {} : { tab: value })} className={tab === value ? "-mb-px border-b-2 border-primary pb-2.5 font-semibold text-[#1b1c19]" : "-mb-px border-b-2 border-transparent pb-2.5 text-[#74736b] hover:text-[#1b1c19]"}>{label}</button>)}
            </div>
            {tab === "providers" && <Providers />}
            {tab === "api" && <LegacySettings section="api" />}
            {tab === "webhooks" && <LegacySettings section="webhooks" />}
            {tab === "diagnostics" && <Diagnostics />}
        </div>
    );
}
