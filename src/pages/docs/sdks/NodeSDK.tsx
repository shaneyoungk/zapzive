import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, KeyRound, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

export default function NodeSDK() {
    return (
        <div className="max-w-5xl space-y-12">
            <header className="border-b border-[#d9d6cd] pb-10">
                <div className="flex flex-wrap items-center gap-3">
                    <p className="mono-label text-[#087f5b]">Server integration</p>
                    <Badge variant="outline" className="border-[#cdd8c8] text-[#087f5b]">REST + fetch</Badge>
                </div>
                <h1 className="mt-5 text-5xl">Node.js integration</h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-[#575750]">
                    Zapzive does not currently ship an npm SDK. Use the sandbox REST API from your server with Node’s built-in fetch, or wrap the same request contract in your own typed client.
                </p>
            </header>

            <DocCallout type="info" title="No package to install">
                Do not install <code>@zapzive/client</code> or import a fictional SDK. The examples below call the routes that are available in this repository today. Keep the secret key on your server and never expose it to a browser bundle.
            </DocCallout>

            <section className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
                <div>
                    <div className="flex items-center gap-3"><Terminal size={18} className="text-[#087f5b]" /><h2 className="text-2xl">Create a small client</h2></div>
                    <p className="mt-4 text-sm leading-7 text-[#575750]">Centralize the base URL, authorization, request ID, and idempotency behavior so every money-moving call follows the same rules.</p>
                </div>
                <CodeWindow language="typescript" title="zapzive.ts" showLineNumbers code={`const baseUrl = process.env.ZAPZIVE_API_URL ?? "http://localhost:3001";
const apiKey = process.env.ZAPZIVE_API_KEY;

if (!apiKey) throw new Error("ZAPZIVE_API_KEY is required");

export async function zapzive<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
      ...(options.body ? { "Idempotency-Key": crypto.randomUUID() } : {}),
      ...options.headers,
    },
  });

  const body = await response.json();
  if (!response.ok) throw new Error(\`\${body.code ?? "REQUEST_FAILED"}: \${body.error}\`);
  return body as T;
}`} />
            </section>

            <section className="space-y-6 border-t border-[#d9d6cd] pt-12">
                <div className="flex items-center gap-3"><KeyRound size={18} className="text-[#087f5b]" /><h2 className="text-2xl">Create a sandbox remittance</h2></div>
                <p className="max-w-2xl text-sm leading-7 text-[#575750]">Create the recipient first, request a quote, then submit the remittance with a stable idempotency key. The backend returns a completed sandbox record; it does not represent a live bank payout.</p>
                <CodeWindow language="typescript" title="send-remittance.ts" showLineNumbers code={`const recipient = await zapzive<{ id: string }>("/api/remittance/recipients/add", {
  method: "POST",
  body: JSON.stringify({ name: "Amina Otieno", phone: "+254700000000", country: "KE", mobileNumber: "+254700000000" }),
});

const quote = await zapzive<{ destinationAmount: number }>("/api/remittance/quote", {
  method: "POST",
  body: JSON.stringify({ amount: 50, currency: "USDC", localCurrency: "KES" }),
});

const remittance = await zapzive("/api/remittance", {
  method: "POST",
  headers: { "Idempotency-Key": \`remittance-\${crypto.randomUUID()}\` },
  body: JSON.stringify({ sender: "QA Sandbox", recipientId: recipient.id, amount: 50, currency: "USDC", localCurrency: "KES", deliveryMethod: "mobile-money" }),
});

console.log(quote.destinationAmount, remittance);`} />
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <Rule title="Keep keys server-side" copy="Use environment variables and a secret manager." />
                <Rule title="Retry safely" copy="Reuse the same Idempotency-Key after a timeout." />
                <Rule title="Log request IDs" copy="Keep X-Request-Id with your application logs." />
            </section>

            <Link to="/docs/quickstart" className="inline-flex items-center gap-2 text-sm font-semibold text-[#087f5b]">Read the REST quickstart <ArrowRight size={15} /></Link>
        </div>
    );
}

function Rule({ title, copy }: { title: string; copy: string }) {
    return <div className="rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-5"><h3 className="text-sm font-semibold text-[#20211e]">{title}</h3><p className="mt-2 text-xs leading-6 text-[#77766e]">{copy}</p></div>;
}
