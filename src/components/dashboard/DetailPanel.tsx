import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface DetailPanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    width?: "sm" | "md" | "lg" | "xl";
}

const widthClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

export default function DetailPanel({
    isOpen,
    onClose,
    title,
    children,
    width = "lg",
}: DetailPanelProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-[#20211e]/45 backdrop-blur-[2px]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={`fixed bottom-0 right-0 top-0 ${widthClasses[width]} z-50 flex w-full flex-col border-l border-[#d9d6cd] bg-[#fffdf8] shadow-[-18px_0_48px_rgba(32,33,30,.12)]`}
                    >
                        {/* Header */}
                        <div className="flex min-h-[72px] items-center justify-between border-b border-[#d9d6cd] bg-[#f5f3ee]/95 px-5 backdrop-blur-xl sm:px-6">
                            <div><p className="dashboard-eyebrow">Details</p><h2 className="text-lg font-semibold tracking-[-.035em] text-[#20211e]">
                                {title}
                            </h2></div>
                            <button
                                onClick={onClose}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d6cd] bg-[#fffdf8] text-[#77766e] transition-colors hover:border-[#b9d9cc] hover:text-[#20211e]"
                                aria-label="Close details"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
