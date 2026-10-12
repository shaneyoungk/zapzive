import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const startingPoints = [
  ["01", "Create a workspace", "Your company gets an isolated test environment."],
  ["02", "Set up a payment", "Add a sample batch, transfer, escrow, or balance move."],
  ["03", "Review the result", "See every status change and the resulting record."],
] as const;

export function CTASection() {
  return (
    <section className="home-section border-b border-[#d4d8cf] bg-[#e9eee7]">
      <div className="homepage-frame grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="homepage-eyebrow">Start in test mode</p>
          <h2 className="homepage-title">Run your first payout <em>in the sandbox today.</em></h2>
          <p className="homepage-copy">
            Load the sample payout scenario, approve a run, resolve a failed payout and reconcile it, in about ten minutes. No live funds move.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" className="h-12 rounded-[10px] bg-[#20211e] px-6 text-sm font-semibold text-[#fffdf8] hover:bg-[#087f5b]">
                Create a workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" size="lg" className="h-12 rounded-[10px] border-[#aeb8ae] bg-transparent px-6 text-sm font-semibold text-[#20211e] hover:border-[#20211e] hover:bg-[#fffdf8]">
                Read API docs
              </Button>
            </Link>
          </div>
        </div>

        <div className="border-t border-[#bdc8bd] lg:border-t-0">
          <p className="homepage-eyebrow pt-6 lg:pt-0">Your first three steps</p>
          <div className="mt-5">
            {startingPoints.map(([number, title, detail]) => (
              <div key={number} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 border-t border-[#cbd4c9] py-5 first:border-t-0 first:pt-0">
                <span className="font-mono text-[11px] font-semibold tracking-[.08em] text-[#087f5b]">{number}</span>
                <div>
                  <h3 className="text-lg font-bold tracking-[-.04em] text-[#20211e]">{title}</h3>
                  <p className="mt-1 text-[15px] leading-6 text-[#5d5d56]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-[#bdc8bd] py-5 text-sm font-semibold text-[#087f5b]">
            <Check size={16} /> Sandbox with a simulated provider
          </div>
        </div>
      </div>
    </section>
  );
}
