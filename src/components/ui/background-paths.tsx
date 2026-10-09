import { motion, useReducedMotion } from "framer-motion";
import { type HTMLAttributes, type ReactNode, useId, useMemo } from "react";
import { cn } from "@/lib/utils";

type PathFamily = "primary" | "secondary" | "accent";

interface PathLine {
  id: string;
  d: string;
  opacity: number;
  width: number;
  duration: number;
  delay: number;
  travel: number;
}

export interface BackgroundPathsProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
}

/*
 * Adapted for Zapzive from Kokonut UI's Background Paths (MIT):
 * https://github.com/kokonut-labs/kokonutui
 * The composition is intentionally quieter than the original so the product
 * interface and the payment message remain the page's primary focal points.
 */
function buildPath(index: number, family: PathFamily): string {
  const segmentCount = family === "primary" ? 9 : family === "secondary" ? 8 : 7;
  const direction = family === "secondary" ? -1 : 1;
  const amplitude = family === "primary" ? 128 : family === "secondary" ? 84 : 48;
  const startX = 1320 * direction;
  const endX = -1320 * direction;
  const startY = 430 - index * (family === "primary" ? 31 : 37);
  const endY = -430 + index * (family === "primary" ? 33 : 39);
  const phase = index * 0.56 + (family === "accent" ? 1.4 : 0);
  const points = Array.from({ length: segmentCount + 1 }, (_, pointIndex) => {
    const progress = pointIndex / segmentCount;
    const eased = progress * progress * (3 - 2 * progress);
    const x = startX + (endX - startX) * eased;
    const baseY = startY + (endY - startY) * eased;
    const wave =
      Math.sin(progress * Math.PI * 3 + phase) * amplitude * (1 - eased * 0.36) +
      Math.cos(progress * Math.PI * 5 + phase) * amplitude * 0.22;

    return { x, y: baseY + wave };
  });

  return points.map((point, pointIndex) => {
    if (pointIndex === 0) return `M ${point.x} ${point.y}`;

    const previous = points[pointIndex - 1];
    const controlDistance = (point.x - previous.x) * 0.42;
    return `C ${previous.x + controlDistance} ${previous.y}, ${point.x - controlDistance} ${point.y}, ${point.x} ${point.y}`;
  }).join(" ");
}

function makePaths(family: PathFamily, count: number): PathLine[] {
  const baseOpacity = family === "primary" ? 0.42 : family === "secondary" ? 0.26 : 0.2;
  const width = family === "primary" ? 1.55 : family === "secondary" ? 1.05 : 0.8;
  const duration = family === "primary" ? 15 : family === "secondary" ? 19 : 12;

  return Array.from({ length: count }, (_, index) => ({
    id: `${family}-${index}`,
    d: buildPath(index, family),
    opacity: Math.min(baseOpacity + index * 0.018, family === "primary" ? 0.6 : 0.42),
    width: width + index * 0.07,
    duration: duration + index * 0.65,
    delay: index * 0.07,
    travel: family === "primary" ? -(9 + index % 4) : family === "secondary" ? 7 + index % 3 : -(4 + index % 3),
  }));
}

export function BackgroundPaths({ children, className, ...props }: BackgroundPathsProps) {
  const reducedMotion = useReducedMotion();
  const gradientId = `zapzive-paths-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const pathFamilies = useMemo(() => [
    makePaths("primary", 12),
    makePaths("secondary", 10),
    makePaths("accent", 6),
  ], []);

  return (
    <div {...props} className={cn("relative isolate overflow-hidden", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <svg
          className="h-full w-full"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          viewBox="-1320 -520 2640 1040"
        >
          <defs>
            <linearGradient id={gradientId} x1="-1320" x2="1320" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#dfeee7" />
              <stop offset="38%" stopColor="#11a879" />
              <stop offset="72%" stopColor="#087f5b" />
              <stop offset="100%" stopColor="#c8e7db" />
            </linearGradient>
          </defs>

          {pathFamilies.flat().map((path) => (
            <motion.path
              key={path.id}
              animate={reducedMotion ? { opacity: path.opacity, y: 0 } : { opacity: path.opacity, y: [0, path.travel, 0] }}
              d={path.d}
              initial={{ opacity: 0, y: 12 }}
              stroke={`url(#${gradientId})`}
              strokeLinecap="round"
              strokeWidth={path.width}
              transition={reducedMotion
                ? { duration: 0.35, delay: path.delay }
                : {
                    opacity: { duration: 0.8, delay: path.delay },
                    y: { duration: path.duration, delay: path.delay, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" },
                  }}
            />
          ))}
        </svg>
      </div>

      {children}
    </div>
  );
}
