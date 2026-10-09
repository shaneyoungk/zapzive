import { useEffect, useState } from "react";
import {
    Building2,
    Users,
    Key,
    Webhook,
    Bell,
    Shield,
    Save,
    Plus,
    Trash2,
    Zap,
    Activity,
    Globe,
    ExternalLink,
    Settings as SettingsIcon,
    Copy,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InfoTooltip from "@/components/dashboard/InfoTooltip";
import { motion } from "framer-motion";
import {
    useApiKeys,
    useWebhooks,
    useProfile,
    useGenerateApiKey,
    useRevokeApiKey,
    useCreateWebhook,
    useDeleteWebhook,
    useUpdateProfile,
    useUsageMetrics
} from "@/hooks/use-settings";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ApiKey {
    id: string;
    name: string;
    key: string;
    environment?: string;
    createdAt: string;
    lastUsed?: string;
    scopes?: string[];
}

interface WebhookEndpoint {
    id: string;
    url: string;
    events: string[];
    secret?: string;
    status?: string;
}

interface Metric {
    type: 'api_call' | 'webhook_delivery';
    count: number;
    endpoint?: string;
}

type SettingsTab = "organization" | "api" | "webhooks" | "usage" | "users" | "notifications";

export default function Settings() {
    const { company, updateCompany } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>("organization");
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read", "write"]);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [organizationForm, setOrganizationForm] = useState({ name: "", email: "" });

    const { data: profile } = useProfile();
    const { data: apiKeys = [], isLoading: keysLoading } = useApiKeys();
    const { data: webhooks = [], isLoading: webhooksLoading } = useWebhooks();
    const { data: metrics = [], isLoading: metricsLoading } = useUsageMetrics();

    const generateKeyMutation = useGenerateApiKey();
    const revokeKeyMutation = useRevokeApiKey();
    const createWebhookMutation = useCreateWebhook();
    const deleteWebhookMutation = useDeleteWebhook();
    const updateProfileMutation = useUpdateProfile();

    useEffect(() => {
        if (profile || company) {
            setOrganizationForm({
                name: profile?.name || company?.name || "",
                email: profile?.email || company?.email || "",
            });
        }
    }, [profile, company]);

    const handleGenerateKey = () => {
        if (!newKeyName.trim()) {
            toast.error("Please enter a name for the API key");
            return;
        }
        generateKeyMutation.mutate({ name: newKeyName.trim(), environment: "test", scopes: newKeyScopes }, {
            onSuccess: (createdKey: ApiKey) => {
                setIsGenerateModalOpen(false);
                setNewKeyName("");
                setNewKeyScopes(["read", "write"]);
                if (createdKey?.key) {
                    navigator.clipboard.writeText(createdKey.key).catch(() => undefined);
                    toast.success("Test key created and copied. Store it securely; it will not be shown again.");
                }
            }
        });
    };

    const handleCopyKey = (key: string, id: string) => {
        navigator.clipboard.writeText(key).then(() => {
            setCopiedKey(id);
            toast.success("API key copied to clipboard");
            setTimeout(() => setCopiedKey(null), 2000);
        });
    };

    const handleAddWebhook = () => {
        const url = prompt("Enter webhook URL:");
        if (url) {
            createWebhookMutation.mutate({ url, events: ['*'] });
        }
    };

    const handleSaveOrganization = () => {
        updateProfileMutation.mutate(organizationForm, {
            onSuccess: (updatedCompany) => {
                updateCompany(updatedCompany);
            },
        });
    };

    return (
        <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><p className="dashboard-eyebrow">Workspace configuration</p><h1 className="mt-2 text-3xl">Organization settings</h1><p className="mt-2 text-sm text-[#77766e]">Manage profile, access, integrations, usage, and alerts.</p></div>
                {company?.isTestMode && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            setActiveTab("api");
                            toast.info("Live access requires production review. Your sandbox remains active.");
                        }}
                    >
                        <Zap className="h-4 w-4" />
                        Review live setup
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-[#d9d6cd] no-scrollbar">
                {[
                    { id: "organization", label: "Organization", icon: Building2 },
                    { id: "api", label: "API Keys", icon: Key },
                    { id: "webhooks", label: "Webhooks", icon: Webhook },
                    { id: "usage", label: "Usage", icon: Activity },
                    { id: "users", label: "Users", icon: Users },
                    { id: "notifications", label: "Notifications", icon: Bell },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as SettingsTab)}
                            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all duration-200 border-b-2 whitespace-nowrap ${activeTab === tab.id
                                ? "border-[#11a879] text-[#087f5b]"
                                : "border-transparent text-[#77766e] hover:bg-[#fffdf8] hover:text-[#20211e]"
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Organization Tab */}
            {activeTab === "organization" && (
                <div className="space-y-6">
                    <div className="premium-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-foreground dark:text-white text-[15px]">Organization Profile</h3>
                            <InfoTooltip content="Manage your company identity and status." />
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-2 block font-medium">Organization Name</label>
                                    <input
                                        type="text"
                                        value={organizationForm.name}
                                        onChange={(event) => setOrganizationForm((current) => ({ ...current, name: event.target.value }))}
                                        className="w-full h-10 px-4 bg-card dark:bg-white/[0.04] border border-border dark:border-white/[0.08] rounded-lg text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-2 block font-medium">Environment Status</label>
                                    <div className={`h-10 px-4 flex items-center rounded-lg border text-sm font-semibold ${company?.isTestMode ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'}`}>
                                        {company?.isTestMode ? 'Test Mode Enabled' : 'Live Mode Active'}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-muted-foreground dark:text-zinc-500 mb-2 block font-medium">Business Email</label>
                                    <input
                                        type="email"
                                        value={organizationForm.email}
                                        onChange={(event) => setOrganizationForm((current) => ({ ...current, email: event.target.value }))}
                                        className="w-full h-10 px-4 bg-card dark:bg-white/[0.04] border border-border dark:border-white/[0.08] rounded-lg text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground dark:text-zinc-500 mb-2 block font-medium">Country</label>
                                    <div className="w-full h-10 px-4 bg-card dark:bg-white/[0.04] border border-border dark:border-white/[0.08] rounded-lg text-sm text-foreground dark:text-white flex items-center">
                                        {company?.country || 'United States'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    variant="institutional"
                                    className="h-10 px-6"
                                    onClick={handleSaveOrganization}
                                    disabled={updateProfileMutation.isPending}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* API Keys Tab */}
            {activeTab === "api" && (
                <div className="space-y-6">
                    <div className="premium-card overflow-hidden">
                        <div className="card-header flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-foreground dark:text-white text-[15px] mb-1">API Keys</h3>
                                <p className="text-xs text-muted-foreground dark:text-zinc-500">Programmatic access to the Zapzive infrastructure</p>
                            </div>
                            <Button
                                variant="institutional"
                                onClick={() => setIsGenerateModalOpen(true)}
                                disabled={generateKeyMutation.isPending}
                                className="h-8 px-4 text-[11px]"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Generate Key
                            </Button>
                        </div>

                        {/* Generate Key Modal */}
                        <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
                            <DialogContent className="sm:max-w-[425px] bg-card dark:bg-[#0A0A0A] border border-border dark:border-white/10">
                                <DialogHeader>
                                    <DialogTitle className="text-foreground dark:text-white">Generate API Key</DialogTitle>
                                    <DialogDescription className="text-zinc-500">
                                        Enter a descriptive name for your new API key to help you identify it later.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="keyName" className="text-zinc-400">Key Name</Label>
                                        <Input
                                            id="keyName"
                                            placeholder="e.g. Production Mobile App"
                                            value={newKeyName}
                                            onChange={(e) => setNewKeyName(e.target.value)}
                                            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleGenerateKey();
                                            }}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-zinc-400">Permissions</Label>
                                        <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                            {[
                                                ["read", "Read resources and balances"],
                                                ["write", "Create and update sandbox resources"],
                                                ["approve", "Approve payroll and release escrow funds"],
                                            ].map(([scope, label]) => (
                                                <label key={scope} className="flex items-start gap-3 text-xs text-zinc-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={newKeyScopes.includes(scope)}
                                                        onChange={(event) => setNewKeyScopes((current) => event.target.checked ? [...new Set([...current, scope])] : current.filter((item) => item !== scope))}
                                                        className="mt-0.5 accent-emerald-500"
                                                    />
                                                    <span><strong className="font-mono text-emerald-400">{scope}</strong><br /><span className="text-zinc-500">{label}</span></span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-zinc-500">Choose only what this integration needs. Live keys remain unavailable until production review.</p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsGenerateModalOpen(false)}
                                        className="text-zinc-400 hover:text-white hover:bg-white/5"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleGenerateKey}
                                        disabled={generateKeyMutation.isPending || !newKeyName.trim() || newKeyScopes.length === 0}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                                    >
                                        {generateKeyMutation.isPending ? "Generating..." : "Generate Key"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <div className="divide-y divide-white/[0.06]">
                            {keysLoading ? (
                                <div className="p-12 text-center text-zinc-500">Loading API keys...</div>
                            ) : apiKeys.length > 0 ? (
                                (apiKeys as ApiKey[]).map((apiKey) => (
                                    <div key={apiKey.id} className="p-5 hover:bg-white/[0.01] transition-colors">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-semibold text-white text-sm">{apiKey.name}</h4>
                                                    <StatusBadge status="active" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs font-mono text-muted-foreground dark:text-zinc-400 bg-secondary/50 dark:bg-black/40 border border-border dark:border-white/[0.05] px-3 py-1.5 rounded-lg flex-1 md:flex-none">
                                                        {apiKey.key || "••••••••••••••••"}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            if (apiKey.key?.startsWith("••")) {
                                                                toast.info("This key is masked. Generate a replacement if you no longer have the original.");
                                                                return;
                                                            }
                                                            handleCopyKey(apiKey.key, apiKey.id);
                                                        }}
                                                        className="p-2 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                        title="Copy API key"
                                                    >
                                                        {copiedKey === apiKey.id ? (
                                                            <Check className="w-4 h-4 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to revoke this API key? This action is irreversible.")) {
                                                        revokeKeyMutation.mutate(apiKey.id);
                                                    }
                                                }}
                                                className="h-8 w-8 p-0 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-6 text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <Building2 className="w-3 h-3" />
                                                Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1.5 font-bold text-emerald-500/70">
                                                <Zap className="w-3 h-3" />
                                                {apiKey.environment === 'test' ? 'Test Environment' : 'Live Environment'}
                                            </span>
                                            <span className="font-mono normal-case tracking-normal text-zinc-500">{apiKey.scopes?.join(' · ') || 'read · write'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <Key className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                                    <p className="text-zinc-500 text-sm">No API keys generated yet</p>
                                    <p className="text-zinc-600 text-xs mt-1">Generate a key to start integrating your systems</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-4">
                        <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-blue-400 font-semibold mb-1">Key Security Policy</p>
                            <p className="text-blue-500/70 text-xs leading-relaxed">
                                API keys provide full access to your organization's data. Never commit them to version control or share them via insecure channels.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Webhooks Tab */}
            {activeTab === "webhooks" && (
                <div className="space-y-6">
                    <div className="premium-card overflow-hidden">
                        <div className="card-header flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white text-[15px] mb-1">Webhook Endpoints</h3>
                                <p className="text-xs text-zinc-500">Receive real-time push notifications for system events</p>
                            </div>
                            <Button
                                onClick={handleAddWebhook}
                                className="btn-primary h-8 px-3 rounded-lg text-xs"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Add Endpoint
                            </Button>
                        </div>

                        <div className="divide-y divide-white/[0.06]">
                            {webhooksLoading ? (
                                <div className="text-center py-12 text-zinc-500 font-medium">Syncing endpoints...</div>
                            ) : webhooks.length > 0 ? (
                                (webhooks as WebhookEndpoint[]).map((webhook) => (
                                    <div key={webhook.id} className="p-5 hover:bg-white/[0.01] transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="font-semibold text-white text-sm truncate">{webhook.url}</h4>
                                                    <StatusBadge status="active" />
                                                </div>
                                                <p className="text-xs text-zinc-500">Monitoring: <span className="text-zinc-400">{webhook.events?.join(", ") || "all events"}</span></p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button className="h-8 w-8 p-0 text-zinc-500 hover:text-white hover:bg-white/5">
                                                    <SettingsIcon className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        if (confirm("Delete this webhook endpoint?")) {
                                                            deleteWebhookMutation.mutate(webhook.id);
                                                        }
                                                    }}
                                                    className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-2 bg-secondary/30 dark:bg-black/20 rounded-lg border border-border dark:border-white/[0.05]">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground dark:text-zinc-600 px-2 border-r border-border dark:border-white/10">Secret</span>
                                            <code className="text-xs font-mono text-muted-foreground dark:text-zinc-400 flex-1 truncate">
                                                {webhook.secret || "whsec_••••••••••••••••••••••••"}
                                            </code>
                                            <Button variant="ghost" className="h-6 text-[10px] text-emerald-500 px-2 py-0">Copy</Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-12 h-12 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Webhook className="w-6 h-6 text-zinc-700" />
                                    </div>
                                    <p className="text-zinc-500 text-sm font-medium">Ready for real-time events?</p>
                                    <p className="text-zinc-600 text-xs mt-1">Register a service URL to receive automated event notifications.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Usage Metrics Tab */}
            {activeTab === "usage" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="premium-card p-5">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Total API Calls</p>
                            <div className="flex items-end justify-between">
                                <h4 className="text-3xl font-bold text-white tracking-tight">
                                    {(metrics as Metric[]).reduce((acc, m) => acc + (m.type === 'api_call' ? m.count : 0), 0)}
                                </h4>
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Zap className="w-5 h-5 text-blue-500" />
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-5">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Webhook Deliveries</p>
                            <div className="flex items-end justify-between">
                                <h4 className="text-3xl font-bold text-white tracking-tight">
                                    {(metrics as Metric[]).reduce((acc, m) => acc + (m.type === 'webhook_delivery' ? m.count : 0), 0)}
                                </h4>
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Globe className="w-5 h-5 text-emerald-500" />
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-5">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Success Rate</p>
                            <div className="flex items-end justify-between">
                                <h4 className="text-3xl font-bold text-white tracking-tight">99.8%</h4>
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <Shield className="w-5 h-5 text-amber-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card p-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-semibold text-white text-[15px]">Traffic Distribution</h3>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="text-xs text-zinc-500 mr-4">API</span>
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-xs text-zinc-500">Webhooks</span>
                            </div>
                        </div>

                        {metricsLoading ? (
                            <div className="h-[200px] flex items-center justify-center text-zinc-500 text-sm italic">Analyzing traffic patterns...</div>
                        ) : metrics.length > 0 ? (
                            <div className="space-y-6">
                                {(metrics as Metric[]).map((m, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-zinc-400">{m.endpoint || 'Global API'}</span>
                                            <span className="text-white">{m.count} reqs</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(m.count / Math.max(...(metrics as Metric[]).map((x) => x.count))) * 100}%` }}
                                                className={`h-full ${m.type === 'api_call' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[200px] flex flex-col items-center justify-center text-center">
                                <Activity className="w-10 h-10 text-zinc-800 mb-3" />
                                <p className="text-zinc-500 text-sm">No activity recorded for this period</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Users Tab - Minimal implementation for demo */}
            {activeTab === "users" && (
                <div className="premium-card p-8 text-center bg-zinc-900/40">
                    <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-2">Team Management</h3>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">
                        Invite collaborators and manage access levels. This feature requires an Enterprise plan.
                    </p>
                    <Button variant="outline" className="border-white/10 hover:bg-white/5">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Upgrade to Enterprise
                    </Button>
                </div>
            )}

            {/* Notifications Tab - Simple toggles */}
            {activeTab === "notifications" && (
                <div className="premium-card p-6">
                    <h3 className="font-semibold text-white text-[15px] mb-6">Security & Alerts</h3>
                    <div className="space-y-2">
                        {[
                            "Email notifications for failed API calls",
                            "Security alerts for new API key generation",
                            "Daily transaction summary reports",
                            "Login alerts from new devices"
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/5">
                                <span className="text-sm text-zinc-300">{item}</span>
                                <div className="w-10 h-5 bg-emerald-500 rounded-full flex items-center justify-end px-1">
                                    <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
