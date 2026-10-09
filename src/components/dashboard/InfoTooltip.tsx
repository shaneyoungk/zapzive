import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
    content: string;
    className?: string;
}

export default function InfoTooltip({ content, className }: InfoTooltipProps) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#d9d6cd] bg-[#fffdf8] text-[#77766e] transition-colors hover:border-[#b9d9cc] hover:text-[#087f5b] ${className}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Info className="w-3 h-3" />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="max-w-xs border-[#3d3d36] bg-[#20211e] px-3 py-2 text-xs leading-5 text-[#f5f3ee]"
                >
                    <p>{content}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
