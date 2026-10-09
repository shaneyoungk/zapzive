import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const testimonials = [
  {
    quote: "Paying our Nigerian dev team used to take 5 days with Wise. zapzive settles in 3 seconds directly to their bank accounts.",
    author: "Elena Rodriguez",
    role: "CTO",
    company: "TechNexus SF",
    initials: "ER",
  },
  {
    quote: "The smart escrow feature solved our trust issues with freelance designers. Milestone releases are a game changer.",
    author: "David Osei",
    role: "Founder",
    company: "Creative Afric",
    initials: "DO",
  },
  {
    quote: "Finally, a real use case for stablecoins. We save $4,000/month on FX fees by paying our global staff in USDC.",
    author: "Sarah Jenkins",
    role: "VP Operations",
    company: "GlobalScale London",
    initials: "SJ",
  },
];

export function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-32 lg:py-40 bg-transparent">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-20"
        >
          <span className="tag tag-muted mb-6 inline-block">Testimonials</span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Trusted by global teams
          </h2>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#fffdf8] p-8 rounded-2xl border border-[#d9d6cd] shadow-[0_8px_24px_rgba(32,33,30,.06)]"
            >
              <p className="text-foreground text-lg leading-relaxed mb-8">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-base font-bold text-brand-400">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

