import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, KeyRound, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

export default function PythonSDK() {
    return (
        <div className="max-w-5xl space-y-12">
            <header className="border-b border-[#d9d6cd] pb-10">
                <div className="flex flex-wrap items-center gap-3"><p className="mono-label text-[#087f5b]">Server integration</p><Badge variant="outline" className="border-[#cdd8c8] text-[#087f5b]">REST + requests</Badge></div>
                <h1 className="mt-5 text-5xl">Python integration</h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-[#575750]">There is no published Zapzive Python package yet. Use a small requests wrapper against the sandbox REST API and keep credentials outside your application source.</p>
            </header>

            <DocCallout type="info" title="Use the API contract directly">
                The package names previously shown on this page were placeholders. The working integration surface is documented REST with JSON, Basic/Bearer API-key authentication, request IDs, and idempotency keys.
            </DocCallout>

            <section className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
                <div><div className="flex items-center gap-3"><Terminal size={18} className="text-[#087f5b]" /><h2 className="text-2xl">Create a safe helper</h2></div><p className="mt-4 text-sm leading-7 text-[#575750]">The helper makes non-idempotent requests explicit and preserves the response body for useful error handling.</p></div>
                <CodeWindow language="python" title="zapzive.py" showLineNumbers code={`import os
import uuid
import requests

BASE_URL = os.getenv("ZAPZIVE_API_URL", "http://localhost:3001")
API_KEY = os.environ["ZAPZIVE_API_KEY"]

def request(method: str, path: str, *, payload=None, idempotent=False):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    if idempotent:
        headers["Idempotency-Key"] = f"python-{uuid.uuid4()}"
    response = requests.request(method, BASE_URL + path, json=payload, headers=headers, timeout=15)
    body = response.json()
    response.raise_for_status()
    return body`} />
            </section>

            <section className="space-y-6 border-t border-[#d9d6cd] pt-12">
                <div className="flex items-center gap-3"><KeyRound size={18} className="text-[#087f5b]" /><h2 className="text-2xl">Submit a sandbox payment</h2></div>
                <CodeWindow language="python" title="send_remittance.py" showLineNumbers code={`recipient = request(
    "POST", "/api/remittance/recipients/add",
    payload={"name": "Amina Otieno", "phone": "+254700000000", "country": "KE", "mobileNumber": "+254700000000"},
)

quote = request(
    "POST", "/api/remittance/quote",
    payload={"amount": 50, "currency": "USDC", "localCurrency": "KES"},
)

transfer = request(
    "POST", "/api/remittance",
    payload={"sender": "QA Sandbox", "recipientId": recipient["id"], "amount": 50, "currency": "USDC", "localCurrency": "KES", "deliveryMethod": "mobile-money"},
    idempotent=True,
)
print(quote["destinationAmount"], transfer["id"], transfer["status"])`} />
            </section>

            <Link to="/docs/quickstart" className="inline-flex items-center gap-2 text-sm font-semibold text-[#087f5b]">Read the REST quickstart <ArrowRight size={15} /></Link>
        </div>
    );
}
