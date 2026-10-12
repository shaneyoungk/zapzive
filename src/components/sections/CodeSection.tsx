import { useState } from "react";
import { ArrowRight, Check, Copy, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

const codeExamples = {
  curl: `curl -X POST "$API_BASE_URL/api/payouts/runs" \\
  -H "Authorization: Bearer $ZAPZIVE_TEST_KEY" \\
  -H "Idempotency-Key: run-2026-10-001" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"October contractors","scheduledFor":"2026-10-16"}'`,
  node: `const response = await fetch(API_BASE_URL + "/api/payouts/runs", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + ZAPZIVE_TEST_KEY,
    "Idempotency-Key": "run-2026-10-001",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "October contractors",
    scheduledFor: "2026-10-16"
  })
});`,
  python: `import requests

response = requests.post(
    API_BASE_URL + "/api/payouts/runs",
    headers={"Authorization": "Bearer " + ZAPZIVE_TEST_KEY},
    json={"name": "October contractors", "scheduledFor": "2026-10-16"}
)
print(response.json()["status"])`,
};

type Language = keyof typeof codeExamples;

const developerBenefits = [
  "Create test keys for a workspace",
  "Retry writes safely with an idempotency key",
  "Receive status and error details",
  "Copy a working request and response",
];

export function CodeSection() {
  const [language, setLanguage] = useState<Language>("node");
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(codeExamples[language]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="developers" className="home-section homepage-dark border-b border-[#2f5e50]">
      <div className="homepage-frame">
        <header className="home-head">
          <p className="homepage-eyebrow"><Terminal size={14} /> For developers</p>
          <div className="home-head__row">
            <h2 className="homepage-title">Create payout runs <em>from your own systems.</em></h2>
            <p className="homepage-copy">
              Use the sandbox API to create a run, add payouts, and follow each one through the same states the dashboard shows. Every write is idempotent.
            </p>
          </div>
        </header>

        <div className="home-section__body grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div>
            <ul className="border-y border-[#ffffff26]">
              {developerBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 border-b border-[#ffffff1a] py-3.5 text-sm font-medium text-[#f1efe8] last:border-b-0">
                  <Check size={16} className="shrink-0 text-[#7de0bf]" />
                  {benefit}
                </li>
              ))}
            </ul>

            <Link to="/docs" className="homepage-link mt-8">
              View API documentation <ArrowRight size={16} />
            </Link>
          </div>

          <div className="developer-console">
            <div className="developer-console__toolbar">
              <div className="flex gap-1" aria-label="Code language">
                {(Object.keys(codeExamples) as Language[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLanguage(item)}
                    aria-pressed={language === item}
                    className={`rounded-[7px] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[.1em] transition-colors ${language === item ? "bg-[#7de0bf] text-[#17382d]" : "text-[#d5d4cb] hover:bg-[#ffffff12] hover:text-[#fffdf8]"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void copyCode()}
                aria-label="Copy code example"
                className="flex shrink-0 items-center gap-2 rounded-[7px] px-2 py-1.5 text-[#d5d4cb] transition hover:bg-[#ffffff12] hover:text-[#fffdf8]"
              >
                <span className="sr-only" aria-live="polite">{copied ? "Code copied" : ""}</span>
                {copied ? <Check size={15} className="text-[#7de0bf]" /> : <Copy size={15} />}
                <span className="hidden font-mono text-[10px] uppercase tracking-[.08em] sm:inline">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="overflow-x-auto p-5 sm:p-6">
              <pre className="min-w-[480px] font-mono text-[11.5px] leading-6 text-[#f1efe8]"><code>{codeExamples[language]}</code></pre>
            </div>

            <div className="developer-console__response">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[#d5d4cb]">Example response / test mode</p>
              <code className="mt-3 block overflow-x-auto whitespace-nowrap font-mono text-[11.5px] leading-6 text-[#9ae6c9]">{`{ "reference": "PR-1048", "status": "draft", "environment": "sandbox" }`}</code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
