import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Terminal, HelpCircle, ShieldAlert } from "lucide-react";

export default function Errors() {
    return (
        <div className="space-y-16 max-w-5xl pb-20">
            <section className="space-y-6">
                <h1 className="text-5xl font-bold text-[#20211e] tracking-tight">Errors & Status</h1>
                <p className="text-xl text-[#575750] leading-relaxed max-w-3xl">
                    zapzive uses standard HTTP response codes to indicate the success or
                    failure of an API request. Codes in the `4xx` range indicate an error
                    that failed given the information provided.
                </p>
            </section>

            {/* Error Object structure */}
            <section className="space-y-8">
                <h2 className="text-2xl font-bold text-[#20211e] flex items-center gap-3">
                    <Terminal className="w-6 h-6 text-[#087f5b]" /> Error Object
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <p className="text-[#575750] leading-relaxed">
                            Every error response includes a JSON object detailing the `type` of
                            failure and a human-readable `message`. This allows your code to
                            programmatically react to specific edge cases.
                        </p>
                        <DocCallout type="info" title="Status Attribute">
                            We include the HTTP status code inside the JSON body as well, to
                            simplify parsing in client-side libraries.
                        </DocCallout>
                    </div>
                    <CodeWindow
                        language="json"
                        title="Error Response"
                        code={`{\n  "error": {\n    "type": "invalid_request_error",\n    "code": "parameter_missing",\n    "message": "The 'amount' parameter is required.",\n    "param": "amount",\n    "status": 400\n  }\n}`}
                    />
                </div>
            </section>

            {/* Status Code Table */}
            <section className="space-y-8 border-t border-[#d9d6cd] pt-16">
                <h2 className="text-2xl font-bold text-[#20211e]">HTTP Status Codes</h2>
                <div className="border border-[#d9d6cd] rounded-2xl overflow-hidden bg-[#fffdf8]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f5f3ee] text-[#575750] font-bold">
                            <tr>
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Meaning</th>
                                <th className="px-6 py-4">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <CodeRow code="200" meaning="OK" desc="Everything worked as expected." />
                            <CodeRow code="400" meaning="Bad Request" desc="The request was unacceptable, often due to missing a required parameter." />
                            <CodeRow code="401" meaning="Unauthorized" desc="No valid API key provided." />
                            <CodeRow code="402" meaning="Request Failed" desc="The parameters were valid but the request failed (e.g. insufficient funds)." />
                            <CodeRow code="403" meaning="Forbidden" desc="The API key doesn't have permissions to perform the request." />
                            <CodeRow code="404" meaning="Not Found" desc="The requested resource doesn't exist." />
                            <CodeRow code="409" meaning="Conflict" desc="The request conflicts with another request (e.g. using the same idempotency key)." />
                            <CodeRow code="429" meaning="Too Many Requests" desc="Rate limit exceeded. Slow down your requests." />
                            <CodeRow code="5xx" meaning="Server Errors" desc="Something went wrong on zapzive's end. (Extremely rare)." />
                        </tbody>
                    </table>
                </div>
            </section>

            <DocCallout type="mistake" title="Ignoring 429s">
                Never ignore 429 errors. Your application should implement <span className="font-bold text-[#20211e]">Exponential Backoff</span>
                and Jitter to spread out retries. Our SDKs handle this automatically.
            </DocCallout>

            {/* Help section */}
            <section className="bg-[#fffdf8] border border-[#d9d6cd] rounded-3xl p-10 flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
                <div className="p-4 rounded-2xl bg-[#f5f3ee] border border-[#d9d6cd]">
                    <HelpCircle className="w-8 h-8 text-[#087f5b]" />
                </div>
                <div className="space-y-2 flex-1">
                    <h3 className="text-xl font-bold text-[#20211e]">Still stuck?</h3>
                    <p className="text-sm text-[#77766e]">
                        Include the <code className="text-[#087f5b]">Request-Id</code> (found in response headers)
                        when contacting support to help us trace your specific transaction.
                    </p>
                </div>
                <button className="h-10 px-6 rounded-full bg-[#fffdf8] text-[#20211e] font-bold text-xs hover:bg-[#f0f3ed] transition-all">
                    Contact Engineering
                </button>
            </section>

        </div>
    );
}

function CodeRow({ code, meaning, desc }: { code: string; meaning: string; desc: string }) {
    return (
        <tr className="hover:bg-[#fffdf8] transition-colors">
            <td className="px-6 py-4 font-mono font-bold text-[#087f5b]">{code}</td>
            <td className="px-6 py-4 font-bold text-[#575750]">{meaning}</td>
            <td className="px-6 py-4 text-[#77766e] leading-relaxed text-[13px]">{desc}</td>
        </tr>
    );
}

