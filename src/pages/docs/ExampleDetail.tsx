import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, ListChecks } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { getExample } from "./examples/exampleData";

export default function ExampleDetail() {
  const { slug } = useParams();
  const example = getExample(slug);

  if (!example) return <Navigate to="/docs/examples" replace />;

  const Icon = example.icon;

  return (
    <div className="pb-24">
      <Link to="/docs/examples" className="inline-flex items-center gap-2 text-xs font-semibold text-[#087f5b] hover:underline"><ArrowLeft size={14} /> All examples</Link>

      <header className="mt-8 border-b border-[#d9d6cd] pb-12">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]"><Icon size={20} strokeWidth={1.8} /></span>
          <div>
            <p className="mono-label text-[#087f5b]">{example.eyebrow}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#77766e]"><Clock3 size={13} /> {example.time}</span>
          </div>
        </div>
        <h1 className="mt-6 text-5xl sm:text-6xl">{example.title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#575750]">{example.description}</p>
      </header>

      <section className="mt-12 grid gap-4 md:grid-cols-[1.1fr_.9fr]" aria-labelledby="solution-overview">
        <div className="rounded-2xl border border-[#cdd8c8] bg-[#e8eee4] p-6 sm:p-7">
          <p className="mono-label text-[#087f5b]">What you will build</p>
          <h2 id="solution-overview" className="mt-3 text-2xl">{example.outcome}</h2>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {example.architecture.map((item, index) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-[#b9d9cc] bg-[#fffdf8] px-3 py-2 text-xs font-medium text-[#575750]">{index > 0 && <ArrowRight size={12} className="text-[#11a879]" />}{item}</span>)}
          </div>
        </div>
        <div className="rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-6 sm:p-7">
          <p className="mono-label text-[#77766e]">Before you begin</p>
          <ul className="mt-5 space-y-3">
            {example.prerequisites.map((item) => <li key={item} className="flex items-start gap-2 text-sm text-[#575750]"><Check size={15} className="mt-0.5 shrink-0 text-[#087f5b]" />{item}</li>)}
          </ul>
        </div>
      </section>

      <DocCallout type="info" title="Follow the steps in order">
        Each step produces the state needed by the next one. Run the requests in sandbox first, inspect the response, and only then continue to the next step.
      </DocCallout>

      <section className="mt-16" aria-labelledby="implementation-heading">
        <p className="mono-label text-[#087f5b]">Implementation</p>
        <h2 id="implementation-heading" className="mt-3 text-3xl">Build the solution step by step.</h2>
        <div className="mt-10 space-y-14">
          {example.steps.map((step, index) => (
            <article key={step.title} className="grid gap-6 md:grid-cols-[72px_minmax(0,1fr)]">
              <div className="relative hidden md:block">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] font-mono text-xs font-semibold text-[#087f5b]">0{index + 1}</span>
                {index < example.steps.length - 1 && <span className="absolute bottom-[-56px] left-6 top-14 w-px bg-[#d9d6cd]" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3"><span className="font-mono text-[9px] font-semibold uppercase tracking-[.1em] text-[#087f5b]">Step 0{index + 1}</span><span className="h-px w-8 bg-[#cdd8c8]" /></div>
                <h3 className="mt-3 text-2xl">{step.title}</h3>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#575750]">{step.description}</p>
                <div className="mt-6"><CodeWindow showLineNumbers code={step.code} language={step.language} title={step.file} /></div>
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#d9d6cd] bg-[#f5f3ee] p-4"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#087f5b]" /><p className="text-sm leading-6 text-[#575750]"><span className="font-semibold text-[#20211e]">Expected result: </span>{step.result}</p></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-[#d9d6cd] pt-12" aria-labelledby="production-checklist">
        <div className="flex items-center gap-3"><ListChecks size={18} className="text-[#087f5b]" /><p className="mono-label text-[#087f5b]">Production checklist</p></div>
        <h2 id="production-checklist" className="mt-3 text-3xl">Before you ship.</h2>
        <div className="mt-7 grid gap-3">
          {example.checklist.map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-[#d9d6cd] bg-[#fffdf8] px-4 py-3 text-sm text-[#575750]"><Check size={15} className="shrink-0 text-[#087f5b]" />{item}</div>)}
        </div>
      </section>

      <div className="mt-12 flex flex-col justify-between gap-4 rounded-2xl border border-[#cdd8c8] bg-[#e8eee4] p-6 sm:flex-row sm:items-center sm:p-7">
        <div><p className="mono-label text-[#087f5b]">Keep exploring</p><h2 className="mt-2 text-xl">{example.nextTitle}</h2></div>
        <Link to={example.nextHref} className="inline-flex w-fit items-center gap-2 rounded-full bg-[#11a879] px-5 py-3 text-sm font-semibold text-[#20211e] hover:bg-[#76d4b5]">Continue <ArrowRight size={15} /></Link>
      </div>
    </div>
  );
}
