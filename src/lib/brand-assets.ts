// Brand marks for tokens, networks, and currencies. Every file is served from
// /public/icons so the dashboard never depends on a third-party CDN at runtime.

export const TOKEN_ICONS: Record<string, string> = {
    USDC: "/icons/tokens/usdc.svg",
    USDT: "/icons/tokens/usdt.svg",
    DAI: "/icons/tokens/dai.svg",
    EURC: "/icons/tokens/eurc.png",
    PYUSD: "/icons/tokens/pyusd.png",
    ETH: "/icons/tokens/eth.svg",
    WETH: "/icons/tokens/eth.svg",
    MATIC: "/icons/tokens/matic.svg",
    POL: "/icons/tokens/matic.svg",
    BTC: "/icons/tokens/btc.svg",
    SOL: "/icons/tokens/sol.svg",
};

export const TOKEN_NAMES: Record<string, string> = {
    USDC: "USD Coin", USDT: "Tether USD", DAI: "Dai", EURC: "Euro Coin", PYUSD: "PayPal USD",
    ETH: "Ether", POL: "Polygon", MATIC: "Polygon", BTC: "Bitcoin", SOL: "Solana",
};

/** Tokens designed to hold a 1:1 value with a fiat currency. */
export const STABLECOINS: Record<string, string> = { USDC: "USD", USDT: "USD", DAI: "USD", PYUSD: "USD", EURC: "EUR" };

export type NetworkKey = "ethereum" | "arbitrum" | "optimism" | "base" | "polygon" | "devnet";

export const NETWORKS: Record<NetworkKey, { name: string; icon: string; color: string; chainIds: number[] }> = {
    ethereum: { name: "Ethereum", icon: "/icons/networks/ethereum.svg", color: "#627EEA", chainIds: [1, 11155111] },
    arbitrum: { name: "Arbitrum", icon: "/icons/networks/arbitrum.png", color: "#28A0F0", chainIds: [42161, 421614] },
    optimism: { name: "Optimism", icon: "/icons/networks/optimism.png", color: "#FF0420", chainIds: [10, 11155420] },
    base: { name: "Base", icon: "/icons/networks/base.svg", color: "#0052FF", chainIds: [8453, 84532] },
    polygon: { name: "Polygon", icon: "/icons/networks/polygon.svg", color: "#8247E5", chainIds: [137, 80002] },
    devnet: { name: "Local devnet", icon: "/icons/networks/devnet.svg", color: "#2b2d29", chainIds: [31337] },
};

/** Public networks, in display order. The local devnet is a development tool, not a rail. */
export const PUBLIC_NETWORKS: NetworkKey[] = ["ethereum", "base", "arbitrum", "optimism", "polygon"];

export function networkKeyFor(value: number | string | undefined | null): NetworkKey | null {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "number" || /^\d+$/.test(value)) {
        const id = Number(value);
        return (Object.keys(NETWORKS) as NetworkKey[]).find((key) => NETWORKS[key].chainIds.includes(id)) ?? null;
    }
    const name = value.toLowerCase();
    if (name.includes("devnet") || name.includes("localhost") || name.includes("anvil") || name.includes("hardhat")) return "devnet";
    if (name.includes("arbitrum")) return "arbitrum";
    if (name.includes("optimism") || name.startsWith("op ")) return "optimism";
    if (name.includes("base")) return "base";
    if (name.includes("polygon") || name.includes("amoy") || name.includes("matic")) return "polygon";
    if (name.includes("ethereum") || name.includes("sepolia") || name === "mainnet") return "ethereum";
    return null;
}

const CURRENCY_FLAGS: Record<string, string> = {
    USD: "us", EUR: "eu", GBP: "gb", KES: "ke", NGN: "ng", GHS: "gh", ZAR: "za", UGX: "ug", TZS: "tz",
    RWF: "rw", INR: "in", PHP: "ph", MXN: "mx", BRL: "br", CAD: "ca", AUD: "au", JPY: "jp", CNY: "cn",
    AED: "ae", XOF: "sn", XAF: "cm", EGP: "eg", MAD: "ma", ETB: "et",
};

const COUNTRY_CODES = new Set(Object.values(CURRENCY_FLAGS));
const COUNTRY_NAMES: Record<string, string> = {
    "united states": "us", usa: "us", "united kingdom": "gb", uk: "gb", kenya: "ke", nigeria: "ng", ghana: "gh",
    "south africa": "za", uganda: "ug", tanzania: "tz", rwanda: "rw", india: "in", philippines: "ph", mexico: "mx",
    brazil: "br", canada: "ca", australia: "au", japan: "jp", china: "cn", "united arab emirates": "ae", uae: "ae",
    senegal: "sn", cameroon: "cm", egypt: "eg", morocco: "ma", ethiopia: "et",
};

export function flagFor(value: string | undefined | null): string | null {
    if (!value) return null;
    const upper = value.trim().toUpperCase();
    if (CURRENCY_FLAGS[upper]) return `/icons/flags/${CURRENCY_FLAGS[upper]}.svg`;
    const lower = value.trim().toLowerCase();
    if (lower.length === 2 && COUNTRY_CODES.has(lower)) return `/icons/flags/${lower}.svg`;
    if (COUNTRY_NAMES[lower]) return `/icons/flags/${COUNTRY_NAMES[lower]}.svg`;
    return null;
}

/** Formats an exact decimal string for display without converting it to a float first. */
export function formatTokenAmount(amount: string | number, maxFraction = 4): string {
    const text = String(amount);
    if (!/^-?\d+(\.\d+)?$/.test(text)) return text;
    const [whole, fraction = ""] = text.split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const trimmed = fraction.slice(0, maxFraction).replace(/0+$/, "");
    return trimmed ? `${grouped}.${trimmed}` : grouped;
}
