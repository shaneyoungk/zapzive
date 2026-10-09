import { ArrowRight, Check, Code2, Landmark, LockKeyhole, Send } from "lucide-react";
import { Link } from "react-router-dom";

function PayrollPreview() {
  const recipients = [
    { initials: "SC", name: "Sarah Chen", role: "Product designer", amount: "$4,500.00" },
    { initials: "AM", name: "Alex Morgan", role: "Frontend engineer", amount: "$3,800.00" },
    { initials: "JW", name: "James Wilson", role: "Operations", amount: "$2,200.00" },
  ];

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#d9d6cd] bg-[#f5f3ee] text-[#20211e] shadow-[0_8px_20px_rgba(32,33,30,.045)]">
      <div className="flex flex-col justify-between gap-4 border-b border-[#d9d6cd] bg-[#e8eee4] px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <p className="mono-label text-[#77766e]">Batch PAY-2920</p>
          <p className="mt-1.5 text-sm font-semibold">October global payroll</p>
        </div>
        <span className="status-chip self-start sm:self-auto"><Check size={11} strokeWidth={2.5} /> Ready to settle</span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[#d9d6cd] border-b border-[#d9d6cd] bg-[#fffdf8]">
        <div className="px-4 py-3.5"><p className="metric-label">Total</p><p className="mt-1.5 text-base font-semibold tracking-[-.035em]">$10,500</p></div>
        <div className="px-4 py-3.5"><p className="metric-label">Recipients</p><p className="mt-1.5 text-base font-semibold tracking-[-.035em]">3 people</p></div>
        <div className="px-4 py-3.5"><p className="metric-label">Rail</p><p className="mt-1.5 text-base font-semibold tracking-[-.035em]">USDC</p></div>
      </div>

      <div className="divide-y divide-[#dedbd2] px-4 sm:px-5">
        {recipients.map((recipient) => (
          <div key={recipient.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3.5">
            <span className="product-avatar !h-9 !w-9">{recipient.initials}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{recipient.name}</p><p className="mt-0.5 text-[11px] text-[#77766e]">{recipient.role}</p></div>
            <div className="text-right"><p className="font-mono text-xs font-medium">{recipient.amount}</p><p className="mt-1 flex items-center justify-end gap-1 font-mono text-[9px] uppercase tracking-[.08em] text-[#087f5b]"><Check size={10} /> verified</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-col justify-between gap-3 border-t border-[#d9d6cd] bg-[#fffdf8] px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs text-[#575750]"><span className="h-2 w-2 rounded-full bg-[#11a879] shadow-[0_0_0_4px_rgba(17,168,121,.12)]" />All recipient checks passed</div>
        <span className="mono-label text-[#087f5b]">Settlement · 00:03</span>
      </div>
    </div>
  );
}

function EscrowPreview() {
  return <div className="workflow-preview"><div className="flex items-center justify-between border-b border-[#d9d6cd] pb-3"><span className="mono-label text-[#77766e]">Contract 8A21</span><span className="status-chip">Secured</span></div><div className="space-y-2 pt-3">{[["Brand system", "$50,000"], ["Product release", "$25,000"]].map(([label, amount], index) => <div key={label} className="flex items-center gap-3 rounded-lg border border-[#dedbd2] px-3 py-3"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${index === 0 ? "bg-[#11a879] text-[#20211e]" : "bg-[#e8eee4] text-[#087f5b]"}`}>{index === 0 ? <Check size={14} /> : <LockKeyhole size={13} />}</span><div className="flex-1"><p className="text-xs font-semibold">{label}</p><p className="mt-0.5 text-[10px] text-[#77766e]">Milestone {index + 1}</p></div><span className="font-mono text-[10px]">{amount}</span></div>)}</div></div>;
}

function ApiPreview() {
  return <div className="overflow-hidden rounded-xl border border-[#34352f] bg-[#20211e] text-[#d8d6d0]"><div className="flex items-center justify-between border-b border-[#ffffff18] px-4 py-3"><span className="font-mono text-[9px] text-[#aaa9a1]">payout.ts</span><span className="h-2 w-2 rounded-full bg-[#11a879]" /></div><pre className="overflow-x-auto p-4 font-mono text-[10px] leading-5"><code><span className="text-[#76d4b5]">await</span> zapzive.payouts.create({`{`}<br />&nbsp;&nbsp;amount: <span className="text-[#76d4b5]">4500</span>,<br />&nbsp;&nbsp;currency: <span className="text-[#e8eee4]">"USDC"</span>,<br />&nbsp;&nbsp;destination: <span className="text-[#e8eee4]">"KES"</span><br />{`}`});</code></pre></div>;
}

function RemittancePreview() {
  return <div className="workflow-preview"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div className="rounded-xl bg-[#f5f3ee] p-4"><p className="metric-label">You send</p><p className="mt-2 text-xl font-semibold">1,000 <span className="text-xs text-[#77766e]">USD</span></p></div><ArrowRight size={17} className="text-[#11a879]" /><div className="rounded-xl bg-[#e8eee4] p-4"><p className="metric-label">They receive</p><p className="mt-2 text-xl font-semibold text-[#087f5b]">151,500 <span className="text-xs">KES</span></p></div></div><div className="mt-3 flex items-center justify-between border-t border-[#d9d6cd] pt-3 text-[10px] text-[#77766e]"><span>Rate 1 USD = 151.50 KES</span><span className="font-medium text-[#087f5b]">Arrives in seconds</span></div></div>;
}

const workflows = [
  { icon: Send, eyebrow: "Payroll operations", title: "Mass payouts", description: "Settle hundreds of recipient payments from one reviewed batch.", preview: <PayrollPreview />, span: "lg:col-span-2" },
  { icon: LockKeyhole, eyebrow: "Programmable control", title: "Smart escrow", description: "Connect release rules to clear milestone states.", preview: <EscrowPreview />, span: "lg:col-span-1" },
  { icon: Code2, eyebrow: "Developer platform", title: "Developer API", description: "Use one object model for payouts, escrow, and status events.", preview: <ApiPreview />, span: "lg:col-span-1" },
  { icon: Landmark, eyebrow: "Global settlement", title: "Local settlement", description: "Convert digital value into local rails with visible rates and delivery state.", preview: <RemittancePreview />, span: "lg:col-span-2" },
];

export function ValuePropsSection() {
  return <section className="border-b border-[#d9d6cd] bg-[#f5f3ee] px-6 py-24 sm:py-32"><div className="mx-auto max-w-[1160px]">
    <div className="mb-14 grid gap-6 md:grid-cols-[1fr_.7fr] md:items-end"><div><p className="mono-label text-[#087f5b]">Core workflows</p><h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-.065em] sm:text-6xl">Designed around real money movement.</h2></div><p className="max-w-md text-base leading-7 text-[#575750]">Every surface prioritizes decision context: what is moving, who approved it, what it costs, and what happens next.</p></div>
    <div className="grid gap-5 lg:grid-cols-3">{workflows.map(({ icon: Icon, eyebrow, title, description, preview, span }) => <article key={title} className={`${span} group flex min-h-[420px] flex-col rounded-[22px] border border-[#d9d6cd] bg-[#fffdf8] p-6 shadow-[0_10px_28px_rgba(32,33,30,.055)] transition hover:-translate-y-1 hover:border-[#11a879]`}><div className="flex items-start justify-between gap-4"><div><span className="product-icon"><Icon size={18} /></span><p className="mono-label mt-5 text-[#087f5b]">{eyebrow}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d6cd] text-[#77766e] transition group-hover:border-[#11a879] group-hover:bg-[#11a879] group-hover:text-[#20211e]"><ArrowRight size={15} /></span></div><h3 className="mt-5 text-2xl font-semibold tracking-[-.05em]">{title}</h3><p className="mt-3 max-w-md text-sm leading-6 text-[#575750]">{description}</p><div className="mt-auto pt-7">{preview}</div></article>)}</div>
    <div className="mt-8 flex justify-end"><Link to="/features" className="inline-flex items-center gap-2 border-b border-[#20211e] pb-1 text-sm font-semibold">Explore every workflow <ArrowRight size={15} /></Link></div>
  </div></section>;
}
