import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    ArrowLeft,
    Calendar,
    DollarSign,
    User,
    Mail,
    FileText,
    Check,
    X,
    Target,
    Eye,
    CheckCircle2,
    Lock,
    XCircle,
    Clock,
    ShieldCheck,
    AlertCircle,
    ExternalLink
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

export default function ContractDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setTitle } = usePageHeader();
    const [contract, setContract] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
    const [approvalType, setApprovalType] = useState<'milestone' | 'contract'>('milestone');

    const fetchContract = async () => {
        try {
            if (!id) return;
            setContract(await apiClient.getContract(id));
        } catch (error) {
            console.error("Error fetching contract:", error);
            toast.error("Failed to load contract details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchContract();
    }, [id]);

    useEffect(() => {
        if (contract?.title) {
            setTitle(contract.title);
        }
        return () => setTitle(null);
    }, [contract, setTitle]);

    const handleAcceptBid = async (bidId: string) => {
        setActionLoading(bidId);
        try {
            if (!id) return;
            await apiClient.acceptContractBid(id, bidId);
            toast.success("Bid accepted successfully!");
            fetchContract(); // Refresh data
        } catch (error) {
            console.error("Error accepting bid:", error);
            toast.error("Failed to accept bid");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectBid = async (bidId: string) => {
        setActionLoading(bidId);
        try {
            if (!id) return;
            await apiClient.rejectContractBid(id, bidId);
            toast.success("Bid rejected");
            fetchContract(); // Refresh data
        } catch (error) {
            console.error("Error rejecting bid:", error);
            toast.error("Failed to reject bid");
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'released': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'draft': return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
            case 'disputed': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    const getBidStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold mb-2">Contract Not Found</h2>
                <p className="text-muted-foreground mb-6">This contract may not exist or you don't have access to it.</p>
                <Button onClick={() => navigate('/dashboard/escrow')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Contracts
                </Button>
            </div>
        );
    }

    const pendingBids = contract.bids?.filter((b: any) => b.status === 'pending') || [];
    const acceptedBids = contract.bids?.filter((b: any) => b.status === 'accepted') || [];
    const rejectedBids = contract.bids?.filter((b: any) => b.status === 'rejected') || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/dashboard/escrow')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-4 w-px bg-zinc-800" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-2 px-0 hover:bg-transparent"
                        onClick={() => window.open(`/p/contract/${id}`, '_blank')}
                    >
                        <span className="underline decoration-emerald-500/30 underline-offset-4">View Public Page</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    {contract.status === 'active' && contract.lockedAmount > 0 && (
                        <Button
                            size="lg"
                            className="bg-white text-black hover:bg-zinc-200 text-sm font-bold shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all rounded-full px-8"
                            onClick={() => {
                                setApprovalType('contract');
                                setSelectedMilestone(null);
                                setIsApprovalModalOpen(true);
                            }}
                            disabled={actionLoading === 'release'}
                        >
                            {actionLoading === 'release' ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Release
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Budget</p>
                                <p className="text-xl font-bold font-mono">${contract.totalAmount.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Bids</p>
                                <p className="text-xl font-bold">{contract.bids?.length || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Target className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Milestones</p>
                                <p className="text-xl font-bold">{contract.milestones?.length || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Eye className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Views</p>
                                <p className="text-xl font-bold">{contract.views || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Bids Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Proposals ({contract.bids?.length || 0})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {contract.bids?.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No proposals received yet</p>
                                </div>
                            ) : (
                                <>
                                    {/* Pending Bids */}
                                    {pendingBids.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending ({pendingBids.length})</h3>
                                            {pendingBids.map((bid: any) => (
                                                <div key={bid.id} className="border border-border rounded-lg p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4 text-muted-foreground" />
                                                                <span className="font-semibold">{bid.contractorName}</span>
                                                                {bid.isVerified && (
                                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                        Verified
                                                                    </Badge>
                                                                )}
                                                                {!bid.isVerified && (
                                                                    <span className="text-xs text-muted-foreground">(External)</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Mail className="w-3.5 h-3.5" />
                                                                <span>{bid.contractorEmail}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-muted-foreground">Bid Amount</p>
                                                            <p className="text-xl font-bold font-mono">${bid.amount.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium">Proposal:</p>
                                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bid.proposal}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-2 border-t">
                                                        <p className="text-xs text-muted-foreground">
                                                            Submitted {new Date(bid.createdAt).toLocaleDateString()}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleRejectBid(bid.id)}
                                                                disabled={actionLoading === bid.id}
                                                            >
                                                                {actionLoading === bid.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <X className="w-4 h-4 mr-1" />
                                                                        Reject
                                                                    </>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleAcceptBid(bid.id)}
                                                                disabled={actionLoading === bid.id}
                                                            >
                                                                {actionLoading === bid.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <Check className="w-4 h-4 mr-1" />
                                                                        Accept
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Accepted Bids */}
                                    {acceptedBids.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider">Accepted ({acceptedBids.length})</h3>
                                            {acceptedBids.map((bid: any) => (
                                                <div key={bid.id} className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-4 space-y-2">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4 text-muted-foreground" />
                                                                <span className="font-semibold">{bid.contractorName}</span>
                                                                <Badge variant="outline" className={getBidStatusColor(bid.status)}>
                                                                    {bid.status}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Mail className="w-3.5 h-3.5" />
                                                                <span>{bid.contractorEmail}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-muted-foreground">Bid Amount</p>
                                                            <p className="text-xl font-bold font-mono text-emerald-500">${bid.amount.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Rejected Bids */}
                                    {rejectedBids.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Rejected ({rejectedBids.length})</h3>
                                            {rejectedBids.map((bid: any) => (
                                                <div key={bid.id} className="border border-border rounded-lg p-4 opacity-60 space-y-2">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4 text-muted-foreground" />
                                                                <span className="font-semibold">{bid.contractorName}</span>
                                                                <Badge variant="outline" className={getBidStatusColor(bid.status)}>
                                                                    {bid.status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xl font-bold font-mono">${bid.amount.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Milestones */}
                    <Card className="border-border/50 bg-[#0A0A0A]/40 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="border-b border-border/50 bg-[#0A0A0A]/60 py-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-200">
                                    Milestones
                                </CardTitle>
                                <Badge variant="outline" className="font-mono bg-zinc-900/50">
                                    {contract.milestones?.length || 0} Total
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/50">
                                {contract.milestones?.map((milestone: any, index: number) => {
                                    const isReleased = milestone.status === 'completed' && milestone.completedDate; // Assuming backend marks completed when funds release
                                    const isApproved = milestone.status === 'approved';
                                    const isSubmitted = milestone.status === 'completed' && !isReleased; // Repurposing completed for "worker submitted" if needed

                                    // Let's refine based on the new logic
                                    const canApprove = milestone.status === 'completed';
                                    const canRelease = milestone.status === 'approved';
                                    const isPending = !canApprove && !canRelease && milestone.status !== 'released';

                                    return (
                                        <div key={milestone.id} className="p-6 transition-all hover:bg-white/[0.01] group/milestone">
                                            <div className="flex items-start justify-between gap-6">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-border/50 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0 mt-0.5 group-hover/milestone:border-emerald-500/30 group-hover/milestone:text-zinc-200 transition-all">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="font-bold text-white group-hover/milestone:text-emerald-400/90 transition-all truncate">{milestone.title}</h3>
                                                            {milestone.status === 'approved' && (
                                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] h-4 py-0 uppercase tracking-widest px-1.5">Approved</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed group-hover/milestone:text-zinc-400 transition-all mb-4">{milestone.description}</p>

                                                        <div className="flex flex-wrap items-center gap-6">
                                                            <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                                                <Calendar className="w-3 h-3" />
                                                                <span>Due {new Date(milestone.dueDate).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                                                <DollarSign className="w-3 h-3" />
                                                                <span className="text-zinc-300">${milestone.amount.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-3 shrink-0">
                                                    {contract.status === 'active' && (
                                                        <div className="space-y-2">
                                                            {milestone.status === 'approved' ? (
                                                                <Button
                                                                    size="sm"
                                                                    className="h-9 px-6 rounded-full bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                                                                    onClick={() => {
                                                                        setApprovalType('milestone');
                                                                        setSelectedMilestone(milestone);
                                                                        setIsApprovalModalOpen(true);
                                                                    }}
                                                                >
                                                                    Release Funds
                                                                </Button>
                                                            ) : milestone.status === 'released' ? (
                                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-widest">
                                                                    <Check className="w-3 h-3 mr-1.5" />
                                                                    Funds Released
                                                                </Badge>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "h-9 px-6 rounded-full font-bold text-xs transition-all border-white/5",
                                                                        milestone.status === 'completed'
                                                                            ? "bg-white text-black border-transparent hover:bg-zinc-200 shadow-lg"
                                                                            : "bg-zinc-900/50 text-zinc-500 cursor-pointer hover:bg-zinc-800 hover:text-zinc-300"
                                                                    )}
                                                                    onClick={async () => {
                                                                        if (milestone.status !== 'completed') {
                                                                            toast.info("Wait until worker submits milestone... once they submit I can check and approve", {
                                                                                icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
                                                                                duration: 5000,
                                                                            });
                                                                            return;
                                                                        }

                                                                        const confirmed = window.confirm(`Review and approve milestone: ${milestone.title}?`);
                                                                        if (confirmed) {
                                                                            try {
                                                                                if (!id) return;
                                                                                await apiClient.updateContractMilestone(id, milestone.id, { status: 'completed' });
                                                                                toast.success("Milestone approved!");
                                                                                fetchContract();
                                                                            } catch (e) {
                                                                                toast.error("Failed to approve milestone");
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    {milestone.status === 'completed' ? (
                                                                        "Approve"
                                                                    ) : (
                                                                        <span className="flex items-center gap-2">
                                                                            <Lock className="w-3 h-3" />
                                                                            Approve
                                                                        </span>
                                                                    )}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Contract Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Contract Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Client</p>
                                <p className="font-medium">{contract.client}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Contractor</p>
                                <p className="font-medium">{contract.contractor || 'Open Bid'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                                <p className="font-medium">{new Date(contract.startDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">End Date</p>
                                <p className="font-medium">{new Date(contract.endDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Chain</p>
                                <p className="font-medium">{contract.chain}</p>
                            </div>
                            {contract.isPublic && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Public Link</p>
                                    <a
                                        href={`${window.location.origin}/p/contract/${contract.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline break-all"
                                    >
                                        View Public Page
                                    </a>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Description */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {contract.description || 'No description provided.'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Approval Modal */}
            <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
                <DialogContent className="sm:max-w-md bg-[#0A0A0A] border-zinc-800 shadow-2xl">
                    <DialogHeader>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                            <ShieldCheck className="w-6 h-6 text-emerald-500" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-white">Confirm Fund Release</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {approvalType === 'milestone'
                                ? `You are about to release funds for the milestone "${selectedMilestone?.title}". This action is irreversible.`
                                : `You are about to release funds for all approved milestones in "${contract.title}".`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {approvalType === 'contract' && (() => {
                        const approvedMilestones = contract.milestones?.filter((m: any) => m.status === 'approved') || [];
                        const approvedTotal = approvedMilestones.reduce((acc: number, m: any) => acc + m.amount, 0);
                        const hasApproved = approvedMilestones.length > 0;

                        return (
                            <>
                                {!hasApproved ? (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 my-4">
                                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-500/90 leading-relaxed font-medium">
                                            Wait until worker sends a milestone which you have to approve first. Once they submit, you can review and approve to unlock the release button.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="py-6 border-y border-zinc-800/50 my-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-zinc-500 uppercase tracking-widest font-bold">Total Releasable</span>
                                            <span className="text-2xl font-mono font-bold text-white bg-white/5 px-3 py-1 rounded">
                                                ${approvedTotal.toLocaleString()}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest italic flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {approvedMilestones.length} approved milestones ready
                                        </span>
                                    </div>
                                )}

                                <DialogFooter className="sm:justify-between gap-4">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsApprovalModalOpen(false)}
                                        className="flex-1 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className={cn(
                                            "flex-1 font-bold rounded-full transition-all",
                                            hasApproved
                                                ? "bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                                                : "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-50"
                                        )}
                                        disabled={!hasApproved || actionLoading === 'release'}
                                        onClick={async () => {
                                            setActionLoading('release');
                                            try {
                                                // Release all approved milestones
                                                for (const milestone of approvedMilestones) {
                                                    if (!id) return;
                                                    await apiClient.releaseFunds(id, {
                                                        milestoneId: milestone.id,
                                                        amount: milestone.amount
                                                    });
                                                }
                                                toast.success(`Successfully released $${approvedTotal.toLocaleString()}`);
                                                fetchContract();
                                                setIsApprovalModalOpen(false);
                                            } catch (e) {
                                                toast.error("Failed to release funds");
                                            } finally {
                                                setActionLoading(null);
                                            }
                                        }}
                                    >
                                        {actionLoading === 'release' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Confirm Release
                                    </Button>
                                </DialogFooter>
                            </>
                        );
                    })()}

                    {approvalType === 'milestone' && (
                        <>
                            <div className="py-6 border-y border-zinc-800/50 my-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-zinc-500 uppercase tracking-widest font-bold">Release Amount</span>
                                    <span className="text-2xl font-mono font-bold text-white bg-white/5 px-3 py-1 rounded">
                                        ${selectedMilestone?.amount.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Clock className="w-3.5 h-3.5" />
                            <span>Sandbox settlement record · {contract.chain} network context</span>
                                </div>
                            </div>

                            <DialogFooter className="sm:justify-between gap-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsApprovalModalOpen(false)}
                                    className="flex-1 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold rounded-full shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                                    onClick={async () => {
                                        setActionLoading('release');
                                        try {
                                            if (!id) return;
                                            await apiClient.releaseFunds(id, {
                                                milestoneId: selectedMilestone.id,
                                                amount: selectedMilestone.amount
                                            });
                                            toast.success("Funds released successfully!");
                                            fetchContract();
                                            setIsApprovalModalOpen(false);
                                        } catch (e) {
                                            toast.error("Failed to release funds");
                                        } finally {
                                            setActionLoading(null);
                                        }
                                    }}
                                >
                                    Confirm Release
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
