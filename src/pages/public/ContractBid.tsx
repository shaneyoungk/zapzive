
import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Vault,
    Building2,
    Lock,
    Calendar,
    Target,
    CheckCircle2,
    ArrowRight,
    Loader2,
    Check,
    XCircle
    ,Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ZapziveLogo } from "@/components/ui/ZapziveLogo";
import axios from "axios";
import { toast } from "sonner";

type PublicMilestone = {
    id: string;
    title: string;
    description?: string;
    amount: number;
    dueDate: string;
};

type PublicContract = {
    title: string;
    client: string;
    description?: string;
    totalAmount: number;
    lockedAmount: number;
    status: string;
    isPublic: boolean;
    createdAt: string;
    company?: { country?: string; kycVerified?: boolean };
    milestones: PublicMilestone[];
};

const SignupBanner = () => (
    <Card className="relative overflow-hidden border-[#cdd8c8] bg-[#e8eee4] mb-12 shadow-[0_12px_30px_rgba(32,33,30,.07)] group transition-all hover:border-[#11a879]">
        {/* Grain effect - slightly more subtle for lighter background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.12] brightness-100 contrast-120 mix-blend-overlay pointer-events-none" />

        <CardContent className="relative pt-10 pb-10 px-8 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
                            Sandbox escrow invitation
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-semibold text-[#20211e] tracking-[-.055em]">Join the Zapzive ecosystem</h3>
                        <p className="text-[#575750] text-base leading-relaxed max-w-xl mx-auto md:mx-0">
                            Review a sandbox milestone workflow and submit a proposal without moving live funds.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-w-lg mx-auto md:mx-0">
                        {[
                            { label: "Workflow context", desc: "Review the brief" },
                            { label: "Test payout", desc: "Sandbox asset context" },
                            { label: "Milestone controls", desc: "Approval and release state" },
                            { label: "Recipient review", desc: "Keep identity context" }
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3 group/item justify-center md:justify-start">
                                <div className="mt-1 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 transition-all group-hover/item:bg-emerald-500/40">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                                    <p className="text-xs text-zinc-500 font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="shrink-0">
                    <Link to="/signup">
                        <Button size="lg" className="h-12 rounded-[10px] bg-[#183a30] px-8 text-sm font-semibold text-[#f5f3ee] transition-all duration-300 hover:bg-[#087f5b]">
                            Get Started <ArrowRight className="w-5 h-5 ml-3" />
                        </Button>
                    </Link>
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function ContractBid() {
    const { id } = useParams();
    const [contract, setContract] = useState<PublicContract | null>(null);
    const [loading, setLoading] = useState(true);
    const [bidData, setBidData] = useState({
        contractorName: "",
        contractorEmail: "",
        proposal: "",
        amount: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3001')
        .replace(/\/$/, '')
        .replace(/\/api$/, '') + '/api';

    useEffect(() => {
        const fetchContract = async () => {
            try {
                const response = await axios.get(`${apiBase}/escrow/public/${id}`);
                setContract(response.data as PublicContract);
            } catch (error) {
                console.error("Error fetching contract:", error);
                toast.error("Failed to load contract details");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchContract();
    }, [apiBase, id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${apiBase}/escrow/public/${id}/bid`, {
                ...bidData,
                amount: parseFloat(bidData.amount)
            });
            setSubmitted(true);
            toast.success("Bid submitted successfully!");
        } catch (error) {
            console.error("Error submitting bid:", error);
            toast.error("Failed to submit bid");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="public-page min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="public-page min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <div className="text-center max-w-md space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <Shield className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold">Contract Not Found</h1>
                    <p className="text-muted-foreground">This contract may be private or does not exist.</p>
                </div>
            </div>
        );
    }

    // Check if contract is closed (not accepting bids)
    const isClosed = !contract.isPublic || contract.status === 'active' || contract.status === 'completed';
    const fundsLocked = contract.lockedAmount > 0;
    const fundsFullyLocked = contract.lockedAmount >= contract.totalAmount;

    if (submitted) {
        return (
            <div className="public-page min-h-screen bg-background flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <Card>
                        <CardContent className="pt-12 pb-8 text-center space-y-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                                <Check className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Bid Submitted</h2>
                                <p className="text-muted-foreground">
                                    Your proposal has been sent to {contract.client}. They will review and contact you if selected.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (isClosed) {
        return (
            <div className="public-page min-h-screen bg-background">
                <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
                    {/* Header */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="rounded-[10px] border border-[#2f5e50] bg-[#183a30] px-3 py-2"><ZapziveLogo size="sm" /></div>
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-white/[0.03] backdrop-blur-sm self-center">
                                <Vault className="w-3.5 h-3.5 text-zinc-400" />
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Secured Escrow</span>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b">
                            <div className="flex-1 space-y-3">
                                <h1 className="text-3xl lg:text-4xl font-bold">{contract.title}</h1>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        <span className="font-medium text-foreground">{contract.client}</span>
                                    </div>
                                    <span>•</span>
                                    <span>{contract.company?.country || 'Global'}</span>
                                </div>
                            </div>

                            <div className="lg:min-w-[200px]">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Budget</p>
                                    <p className="text-3xl font-bold font-mono">${contract.totalAmount.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <SignupBanner />

                    {/* Contract Closed Message */}
                    <Card className="border-amber-500/20 bg-amber-500/5">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                    <XCircle className="w-6 h-6 text-amber-500" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-lg font-bold">Contract Closed</h3>
                                    <p className="text-muted-foreground">
                                        This contract is no longer accepting new proposals. The client has selected a contractor and the project is now in progress.
                                    </p>
                                    {contract.status === 'active' && (
                                        <p className="text-sm text-muted-foreground">
                                            Status: <span className="font-semibold text-emerald-500">Active</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Project Details */}
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <h2 className="text-xl font-bold">Project Description</h2>
                            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {contract.description || "No description provided."}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5" />
                                <h2 className="text-xl font-bold">Milestones ({contract.milestones.length})</h2>
                            </div>
                            <div className="space-y-3">
                                {contract.milestones.map((milestone, index) => (
                                    <div
                                        key={milestone.id}
                                        className="border border-border rounded-lg p-4"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold mb-1">{milestone.title}</h3>
                                                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="font-mono shrink-0">
                                                ${milestone.amount.toLocaleString()}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-9">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>Due {new Date(milestone.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="public-page min-h-screen bg-background">
            <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="space-y-6">
                    {/* zapzive Branding */}
                    <div className="flex items-center gap-4">
                        <div className="rounded-[10px] border border-[#2f5e50] bg-[#183a30] px-3 py-2"><ZapziveLogo size="sm" /></div>
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-white/[0.03] backdrop-blur-sm self-center">
                            <Vault className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Secured Escrow</span>
                        </div>
                    </div>

                    {/* Title and Budget */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b">
                        <div className="flex-1 space-y-3">
                            <h1 className="text-3xl lg:text-4xl font-bold">{contract.title}</h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    <span className="font-medium text-foreground">{contract.client}</span>
                                    {contract.company?.kycVerified && (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Verified
                                        </Badge>
                                    )}
                                </div>
                                <span>•</span>
                                <span>{contract.company?.country || 'Global'}</span>
                                <span>•</span>
                                <span>Posted {new Date(contract.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="lg:min-w-[200px]">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Budget</p>
                                <p className="text-3xl font-bold font-mono">${contract.totalAmount.toLocaleString()}</p>
                                {fundsLocked && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <Lock className="w-3 h-3 text-emerald-500" />
                                        <span className={fundsFullyLocked ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>
                                            {fundsFullyLocked ? "Funds Secured" : `$${contract.lockedAmount.toLocaleString()} Locked`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <SignupBanner />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - No Cards */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description */}
                        <div className="space-y-3">
                            <h2 className="text-xl font-bold">Project Description</h2>
                            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {contract.description || "No description provided."}
                            </p>
                        </div>

                        {/* Milestones */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5" />
                                <h2 className="text-xl font-bold">Milestones ({contract.milestones.length})</h2>
                            </div>
                            <div className="space-y-3">
                                {contract.milestones.map((milestone, index) => (
                                    <div
                                        key={milestone.id}
                                        className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold mb-1">{milestone.title}</h3>
                                                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="font-mono shrink-0">
                                                ${milestone.amount.toLocaleString()}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-9">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>Due {new Date(milestone.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bid Form - Only Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Submit Proposal</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name / Company</Label>
                                            <Input
                                                id="name"
                                                required
                                                value={bidData.contractorName}
                                                onChange={(e) => setBidData({ ...bidData, contractorName: e.target.value })}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                value={bidData.contractorEmail}
                                                onChange={(e) => setBidData({ ...bidData, contractorEmail: e.target.value })}
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Bid Amount ($)</Label>
                                            <Input
                                                id="amount"
                                                type="number"
                                                required
                                                value={bidData.amount}
                                                onChange={(e) => setBidData({ ...bidData, amount: e.target.value })}
                                                placeholder="5000"
                                                className="font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="proposal">Cover Letter</Label>
                                            <Textarea
                                                id="proposal"
                                                required
                                                value={bidData.proposal}
                                                onChange={(e) => setBidData({ ...bidData, proposal: e.target.value })}
                                                placeholder="Explain why you're a good fit..."
                                                className="min-h-[120px] resize-none"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    Submit Proposal
                                                    <ArrowRight className="w-4 h-4 ml-2" />
                                                </>
                                            )}
                                        </Button>
                                        <p className="text-xs text-center text-muted-foreground">
                                            Your information is secure and will only be shared with the client.
                                        </p>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

