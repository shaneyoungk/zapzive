// Small RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). Used for
// payout-run imports in the browser before rows are sent for validation.

/** Reads a CSV/TSV file as text, handling UTF-8, UTF-8 with BOM and UTF-16 (Excel "Unicode text"). */
export async function readCsvFile(file: File): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
    // UTF-16 without a BOM shows up as many zero bytes.
    const sample = bytes.subarray(0, 200);
    if (sample.length > 4 && sample.filter((byte) => byte === 0).length > sample.length / 4) return new TextDecoder(sample[0] === 0 ? "utf-16be" : "utf-16le").decode(bytes);
    return new TextDecoder("utf-8").decode(bytes);
}

/** Picks the separator used by the header line: comma, semicolon (European Excel) or tab. */
export function detectDelimiter(text: string): string {
    const header = text.split(/\r?\n/, 1)[0] ?? "";
    const counts = [",", ";", "\t"].map((delimiter) => ({ delimiter, count: header.split(delimiter).length - 1 }));
    counts.sort((a, b) => b.count - a.count);
    return counts[0].count > 0 ? counts[0].delimiter : ",";
}

export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (quoted) {
            if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
            else if (char === '"') quoted = false;
            else field += char;
            continue;
        }
        if (char === '"') quoted = true;
        else if (char === delimiter) { row.push(field); field = ""; }
        else if (char === "\n" || char === "\r") {
            if (char === "\r" && input[i + 1] === "\n") i++;
            row.push(field); field = "";
            if (row.some((cell) => cell.trim() !== "")) rows.push(row);
            row = [];
        } else field += char;
    }
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    return rows.map((cells) => cells.map((cell) => cell.trim()));
}

export type ImportField = "name" | "email" | "amount" | "currency" | "reference";

export const IMPORT_FIELDS: Array<{ key: ImportField; label: string; required: boolean; hints: RegExp }> = [
    { key: "name", label: "Recipient name", required: false, hints: /^(recipient|name|payee|contractor|full ?name|beneficiary)/i },
    { key: "email", label: "Recipient email", required: false, hints: /e-?mail/i },
    { key: "amount", label: "Amount", required: true, hints: /^(amount|net|pay|total|sum)/i },
    { key: "currency", label: "Currency", required: false, hints: /^(currency|ccy|cur)/i },
    { key: "reference", label: "Reference / invoice", required: false, hints: /(ref|invoice|period|memo|description)/i },
];

/** Guesses a column for each field from the header row. */
export function guessMapping(headers: string[]): Record<ImportField, number | null> {
    const mapping = { name: null, email: null, amount: null, currency: null, reference: null } as Record<ImportField, number | null>;
    const used = new Set<number>();
    for (const field of IMPORT_FIELDS) {
        const index = headers.findIndex((header, position) => !used.has(position) && field.hints.test(header));
        if (index >= 0) { mapping[field.key] = index; used.add(index); }
    }
    return mapping;
}
