import { ProductDemo } from "@/components/sections/ProductDemo";

/** The animated product walkthrough, placed right below the hero. */
export function ProductDemoSection() {
    return (
        <section id="product-demo" className="product-demo-section" aria-labelledby="product-demo-title">
            <div className="homepage-frame">
                <h2 id="product-demo-title" className="sr-only">A sandbox payout run in Zapzive, from CSV import to reconciliation</h2>
                <ProductDemo />
            </div>
        </section>
    );
}
