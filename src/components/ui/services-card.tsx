import { type CSSProperties, type HTMLAttributes, type PointerEvent, type ReactNode, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface ServicesCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

/**
 * A restrained service-card treatment for high-level choices. The pointer
 * spotlight gives the card feedback without changing its reading order or
 * hiding any content behind an interaction.
 */
export function ServicesCard({ children, className, onPointerMove, style, ...props }: ServicesCardProps) {
  const updateSpotlight = useCallback((event: PointerEvent<HTMLElement>) => {
    onPointerMove?.(event);

    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--service-card-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
    event.currentTarget.style.setProperty("--service-card-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
  }, [onPointerMove]);

  return (
    <article
      {...props}
      className={cn("services-card", className)}
      onPointerMove={updateSpotlight}
      style={{ "--service-card-x": "72%", "--service-card-y": "18%", ...style } as CSSProperties}
    >
      <span aria-hidden="true" className="services-card__wash" />
      <span aria-hidden="true" className="services-card__corner" />
      {children}
    </article>
  );
}
