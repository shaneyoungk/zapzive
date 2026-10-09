import { ArrowRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InfoCardProps {
    title: string;
    description: string;
    children?: React.ReactNode;
    actionScript?: string;
    actionLabel?: string;
}

export function InfoCard({ title, description, children, actionLabel = "Change" }: InfoCardProps) {
    return (
        <div className="premium-card group relative flex h-full flex-col justify-between overflow-hidden p-6 md:p-7">
            <div className="relative z-10 w-full">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-[#20211e]">{title}</h3>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full text-[#77766e] transition-colors hover:bg-[#f5f3ee] hover:text-[#20211e]" aria-label={`More options for ${title}`}>
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </div>
                <p className="mb-8 mt-2 text-sm leading-6 text-[#77766e]">{description}</p>

                <div className="mb-8">
                    {children}
                </div>
            </div>

            <div className="relative z-10 flex items-center justify-between mt-auto">
                <button className="group/btn flex items-center gap-2 text-xs font-semibold text-[#575750] transition-colors hover:text-[#087f5b]">
                    Learn more
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#d9d6cd] bg-[#f5f3ee] transition-all group-hover/btn:translate-x-1 group-hover/btn:border-[#b9d9cc]">
                        <ArrowRight className="w-2 h-2" />
                    </span>
                </button>

                <Button variant="outline" size="sm">
                    {actionLabel}
                </Button>
            </div>
        </div>
    );
}
