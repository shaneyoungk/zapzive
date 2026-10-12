import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageIntroProps {
    title: ReactNode;
    description?: ReactNode;
    /** Buttons on the right; they wrap under the title on small screens. */
    actions?: ReactNode;
    /** Small items under the description, such as a status badge or created date. */
    meta?: ReactNode;
    back?: { to: string; label: string };
    className?: string;
}

/**
 * The standard page opening for every dashboard screen: the page's h1, a
 * one-line purpose and its primary actions. The top bar holds breadcrumbs only,
 * so the page identity is never repeated.
 */
export default function PageIntro({ title, description, actions, meta, back, className }: PageIntroProps) {
    return (
        <section className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
            <div className="min-w-0">
                {back && (
                    <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-[#74736b] transition-colors hover:text-[#1b1c19]">
                        <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
                    </Link>
                )}
                <h1 className="dash-title">{title}</h1>
                {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#74736b]">{description}</p>}
                {meta && <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#74736b]">{meta}</div>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </section>
    );
}
