import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  { value: 2500000000, prefix: "$", suffix: "+", label: "Projected annual volume", format: "currency", context: "Modeled across payout, escrow, and treasury settlement flows." },
  { value: 120000, prefix: "", suffix: "+", label: "Supported businesses and workers", format: "number", context: "Projected users across contractor, merchant, and payroll corridors." },
  { value: 99.9, prefix: "", suffix: "%", label: "Availability target", format: "decimal", context: "Designed for critical payment operations and operational monitoring." },
  { value: 40, prefix: "", suffix: "+", label: "Countries supported", format: "number", context: "Priority rollout across high-friction cash-out and bank payout markets." },
];

function AnimatedCounter({
  value,
  prefix,
  suffix,
  format,
  isInView,
}: {
  value: number;
  prefix: string;
  suffix: string;
  format: string;
  isInView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / 1500, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(eased * value);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, value]);

  const formatValue = (num: number) => {
    if (format === "currency") {
      if (num >= 1000000000) return (num / 1000000000).toFixed(num >= 10000000000 ? 0 : 1) + "B";
      if (num >= 1000000) return Math.round(num / 1000000) + "M";
      if (num >= 1000) return Math.round(num / 1000) + "K";
    }
    if (format === "decimal") return num.toFixed(1);
    return Math.round(num).toLocaleString();
  };

  return (
    <span className="stat-value whitespace-nowrap text-[clamp(2.5rem,4vw,4rem)] text-[#f5f3ee]">
      {prefix}{formatValue(count)}{suffix}
    </span>
  );
}

export function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 sm:py-32 lg:py-40 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0A0A0A]" />

      <div className="container mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold !text-[#f5f3ee] mb-6 tracking-[-.06em]">
            Built for <span className="text-[#11a879]">scale</span>
          </h2>
          <p className="text-lg sm:text-xl text-[#aaa9a1] max-w-2xl mx-auto leading-relaxed">
            Targeting the high-volume Kenya-Nigeria corridor first, then expanding across Africa, LATAM, and Asia.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <AnimatedCounter
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                format={stat.format}
                isInView={isInView}
              />
              <p className="text-[#c8c7c0] text-sm mt-4 font-semibold uppercase tracking-[.08em]">
                {stat.label}
              </p>
              <p className="text-[#8f8f88] text-sm mt-3 leading-relaxed max-w-xs mx-auto">
                {stat.context}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
