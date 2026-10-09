import { ArrowRight, CheckCircle2, Mail, MapPin } from "lucide-react";
import { FormEvent, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

type FormValues = { firstName: string; lastName: string; email: string; brief: string };
const initialValues: FormValues = { firstName: "", lastName: "", email: "", brief: "" };

export default function Contact() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!values.firstName.trim()) next.firstName = "Enter your first name.";
    if (!values.lastName.trim()) next.lastName = "Enter your last name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = "Enter a valid work email.";
    if (values.brief.trim().length < 20) next.brief = "Add at least 20 characters about the workflow.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    localStorage.setItem("zapzive-contact-brief", JSON.stringify({ ...values, savedAt: new Date().toISOString() }));
    setSubmitted(true);
  }

  function update(field: keyof FormValues, value: string) { setValues(current => ({ ...current, [field]: value })); setSubmitted(false); }

  return <div className="public-page min-h-screen"><Navbar /><main className="px-6 pb-24 pt-40"><div className="homepage-frame"><div className="grid gap-14 lg:grid-cols-[.85fr_1.15fr] lg:gap-20"><section><p className="homepage-eyebrow">Start a conversation</p><h1 className="homepage-title homepage-title--wide">Tell us about the payment flow you need to <em>build.</em></h1><p className="homepage-copy">Share where money starts, where it needs to arrive, and the controls your team needs around it.</p><div className="public-contact-details"><div><Mail size={18} /><span><strong>Email</strong>hello@zapzive.network</span></div><div><MapPin size={18} /><span><strong>Product stage</strong>Test workspace · no live provider integrations</span></div></div><ul className="public-check-list">{["Integration and architecture guidance", "Workflow and corridor planning", "Test environment and API review"].map(item => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul></section>
      <section className="public-form"><div className="mb-8 border-b border-[#d9d6cd] pb-6"><p className="homepage-eyebrow">Project brief</p><h2>How can we help?</h2><p>Your brief is saved locally in this browser. Email is available below for a direct route.</p></div>{submitted ? <div className="border border-[#b9d9cc] bg-[#e8f4ef] p-5" role="status"><CheckCircle2 className="text-[#087f5b]" /><h3 className="mt-4 text-lg font-semibold text-[#20211e]">Brief saved</h3><p className="mt-2 text-sm leading-6 text-[#575750]">Your project brief is saved in this browser for review. For a direct response, email hello@zapzive.network with the same context.</p><button type="button" onClick={() => { setValues(initialValues); setSubmitted(false); }} className="mt-5 text-sm font-semibold text-[#087f5b] underline underline-offset-4">Send another brief</button></div> : <form onSubmit={submit} noValidate className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><Field id="firstName" label="First name" value={values.firstName} onChange={value => update("firstName", value)} error={errors.firstName} /><Field id="lastName" label="Last name" value={values.lastName} onChange={value => update("lastName", value)} error={errors.lastName} /></div><Field id="email" label="Work email" type="email" value={values.email} onChange={value => update("email", value)} error={errors.email} /><div><label htmlFor="brief" className="mb-2 block text-sm font-medium text-[#20211e]">What are you looking to build?</label><textarea id="brief" value={values.brief} onChange={event => update("brief", event.target.value)} aria-invalid={Boolean(errors.brief)} aria-describedby={errors.brief ? "brief-error" : undefined} className="min-h-36 w-full resize-none rounded-lg border border-[#d9d6cd] bg-[#f5f3ee] px-4 py-3 text-[#20211e] outline-none transition placeholder:text-[#aaa9a1] focus:border-[#11a879] focus:ring-4 focus:ring-[#11a87912]" placeholder="Share the workflow, corridors, controls, and timeline." />{errors.brief && <p id="brief-error" className="mt-1.5 text-sm text-[#9a3535]">{errors.brief}</p>}</div><button type="submit" className="public-button public-button--wide">Save project brief <ArrowRight size={16} /></button></form>}</section>
    </div></div></main><Footer /></div>;
}

function Field({ id, label, value, onChange, error, type = "text" }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; type?: string }) { return <div><label htmlFor={id} className="mb-2 block text-sm font-medium text-[#20211e]">{label}</label><input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="h-12 w-full rounded-lg border border-[#d9d6cd] bg-[#f5f3ee] px-4 text-[#20211e] outline-none transition placeholder:text-[#aaa9a1] focus:border-[#11a879] focus:ring-4 focus:ring-[#11a87912]" />{error && <p id={`${id}-error`} className="mt-1.5 text-sm text-[#9a3535]">{error}</p>}</div>; }
