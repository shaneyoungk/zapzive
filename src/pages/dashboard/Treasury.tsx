import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Wallet,
    TrendingUp,
    Repeat,
    DollarSign,
    ArrowUpDown,
    Plus,
    Download,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/dashboard/MetricCard";
import InfoTooltip from "@/components/dashboard/InfoTooltip";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { useAssets, usePortfolio, useSwap } from "@/hooks/use-treasury";
import AssetIcon from "@/components/dashboard/AssetIcon";

interface Asset {
    symbol: string;
    name: string;
    balance: number;
    usdValue: number;
    change24h: number;
    chain: string;
    color: string;
    icon: string;
}

export default function Treasury() {
    const navigate = useNavigate();
    const [swapFrom, setSwapFrom] = useState("USDC");
    const [swapTo, setSwapTo] = useState("ETH");
    const [swapAmount, setSwapAmount] = useState("");

    const { data: fetchedAssets = [], isLoading: assetsLoading } = useAssets();
    const { data: fetchedPortfolio = [], isLoading: portfolioLoading } = usePortfolio();
    const swapMutation = useSwap();

    // Never substitute fabricated balances for an empty or failed API response.
    // Financial screens must reflect persisted server state only.
    const assets = fetchedAssets;
    const portfolio = fetchedPortfolio;

    const totalValue = assets.reduce((sum: number, asset: Asset) => sum + asset.usdValue, 0);

    // Dynamic calculations
    const stablecoins = assets.filter((a: Asset) => ["USDC", "USDT", "DAI"].includes(a.symbol));
    const cryptos = assets.filter((a: Asset) => !["USDC", "USDT", "DAI"].includes(a.symbol));

    const stablecoinsValue = stablecoins.reduce((sum: number, a: Asset) => sum + a.usdValue, 0);
    const cryptoValue = cryptos.reduce((sum: number, a: Asset) => sum + a.usdValue, 0);

    const gasReserves = assets
        .filter((a: Asset) => ["ETH", "MATIC", "BNB"].includes(a.symbol))
        .reduce((sum: number, a: Asset) => sum + (a.usdValue * 0.1), 0);

    const portfolioChange = portfolio.length > 0
        ? ((totalValue - portfolio[0].value) / portfolio[0].value) * 100
        : 0;

    const exportPortfolio = () => {
        const rows = [['Symbol', 'Name', 'Balance', 'USD Value', '24h Change', 'Chain'], ...assets.map((asset: Asset) => [
            asset.symbol, asset.name, String(asset.balance), String(asset.usdValue), String(asset.change24h), asset.chain
        ])];
        const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'treasury-assets.csv';
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const submitSwap = () => {
        const amount = Number(swapAmount);
        if (!Number.isFinite(amount) || amount <= 0 || swapFrom === swapTo) return;
        swapMutation.mutate({ fromAsset: swapFrom, toAsset: swapTo, fromAmount: amount, toAmount: amount * 1.02, rate: 1.02, fee: amount * 0.003, chain: 'Ethereum' });
    };

    return (
        <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><p className="dashboard-eyebrow">Liquidity</p><h1 className="mt-2 text-3xl">Asset management</h1><p className="mt-2 text-sm text-[#77766e]">Balances, allocation, and conversions across settlement assets.</p></div>
                <div className="flex gap-2">
                    <Button onClick={exportPortfolio} disabled={!assets.length} variant="outline">
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                    <Button onClick={() => navigate('/dashboard/treasury/transfer')}>
                        <Plus className="h-4 w-4" />
                        Add funds
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total value" value={`$${(totalValue || 0).toLocaleString()}`} icon={Wallet} trend={{ value: Number(portfolioChange.toFixed(2)), label: "24h" }} />
                <MetricCard title="Stablecoins" value={`$${(stablecoinsValue || 0).toLocaleString()}`} icon={DollarSign} subtitle={`${totalValue > 0 ? (stablecoinsValue / totalValue * 100).toFixed(1) : "0.0"}% of portfolio`} />
                <MetricCard title="Other assets" value={`$${(cryptoValue || 0).toLocaleString()}`} icon={TrendingUp} subtitle={`${totalValue > 0 ? (cryptoValue / totalValue * 100).toFixed(1) : "0.0"}% of portfolio`} />
                <MetricCard title="Gas reserve" value={`$${gasReserves.toFixed(0)}`} icon={Repeat} subtitle={gasReserves > 500 ? "Sufficient" : "Needs funding"} />
            </div>

            {/* Portfolio Chart */}
            <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Portfolio Value</h3>
                        <p className="text-xs text-zinc-500">Last 7 days</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-zinc-500 text-xs">Change:</span>
                        <span className={`font-semibold text-sm ${portfolioChange >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                            {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
                        </span>
                    </div>
                </div>
                {portfolioLoading ? (
                    <div className="h-[250px] flex items-center justify-center text-zinc-500">Loading chart...</div>
                ) : portfolio.length === 0 ? (
                    <div className="h-[250px] flex flex-col items-center justify-center text-zinc-500">
                        <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">No portfolio data available</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={portfolio}>
                            <defs>
                                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#dedbd2" opacity={0.8} />
                            <XAxis
                                dataKey="date"
                                stroke="#77766e"
                                tick={{ fill: '#77766e', fontSize: 11 }}
                                axisLine={{ stroke: '#d9d6cd' }}
                            />
                            <YAxis
                                stroke="#77766e"
                                tick={{ fill: '#77766e', fontSize: 11 }}
                                axisLine={{ stroke: '#d9d6cd' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#fffdf8",
                                    border: "1px solid #d9d6cd",
                                    borderRadius: "12px",
                                }}
                                labelStyle={{ color: "#20211e" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#portfolioGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Asset Balances */}
                <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#222]">
                        <h3 className="text-sm font-semibold text-white">Asset Balances</h3>
                    </div>

                    {assetsLoading ? (
                        <div className="p-8 text-center text-zinc-500">Loading assets...</div>
                    ) : (
                        <div className="divide-y divide-[#222]">
                            {assets.map((asset: Asset) => (
                                <div key={asset.symbol} className="p-5 hover:bg-[#0f0f0f] transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
                                                <AssetIcon
                                                    symbol={asset.symbol}
                                                    src={asset.icon}
                                                    forceWhite
                                                    size="sm"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-white text-sm">{asset.symbol}</h4>
                                                <p className="text-xs text-zinc-500">{asset.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-white font-mono tabular-nums">
                                                {(asset.balance || 0).toLocaleString()} {asset.symbol}
                                            </p>
                                            <p className="text-xs text-zinc-500 font-mono">
                                                ${(asset.usdValue || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-zinc-500">{asset.chain}</span>
                                        <span className={`font-medium ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                            {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}% 24h
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Swap Interface */}
                <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-semibold text-white">Swap Assets</h3>
                        <InfoTooltip content="Exchange one asset for another at current market rates." />
                    </div>

                    <div className="space-y-4">
                        {/* From */}
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 block">From</label>
                            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <select
                                        value={swapFrom}
                                        onChange={(e) => setSwapFrom(e.target.value)}
                                        className="bg-transparent text-white font-semibold text-sm focus:outline-none cursor-pointer"
                                    >
                                        {assets.map((asset: Asset) => (
                                            <option key={asset.symbol} value={asset.symbol} className="bg-zinc-900">
                                                {asset.symbol}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-xs text-zinc-500">
                                        Balance: {(assets.find((a: Asset) => a.symbol === swapFrom)?.balance || 0).toLocaleString()}
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={swapAmount}
                                    onChange={(e) => setSwapAmount(e.target.value)}
                                    className="w-full bg-transparent text-2xl font-semibold text-white focus:outline-none placeholder:text-zinc-600 font-mono"
                                />
                            </div>
                        </div>

                        {/* Swap Button */}
                        <div className="flex justify-center -my-2">
                            <button onClick={() => { setSwapFrom(swapTo); setSwapTo(swapFrom); }} className="w-10 h-10 rounded-xl bg-[#222] hover:bg-[#333] flex items-center justify-center transition-colors border border-[#333]" aria-label="Swap direction">
                                <ArrowUpDown className="w-4 h-4 text-zinc-400" />
                            </button>
                        </div>

                        {/* To */}
                        <div>
                            <label className="text-xs text-zinc-500 mb-2 block">To</label>
                            <div className="premium-card p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <select
                                        value={swapTo}
                                        onChange={(e) => setSwapTo(e.target.value)}
                                        className="bg-transparent text-foreground font-semibold text-sm focus:outline-none cursor-pointer"
                                    >
                                        {assets.map((asset: Asset) => (
                                            <option key={asset.symbol} value={asset.symbol} className="bg-zinc-900">
                                                {asset.symbol}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-xs text-zinc-500">
                                        Balance: {(assets.find((a: Asset) => a.symbol === swapTo)?.balance || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-2xl font-semibold text-zinc-700">
                                    {swapAmount ? (parseFloat(swapAmount) * 1.02).toFixed(4) : '0.00'}
                                </div>
                            </div>
                        </div>

                        {/* Rate Info */}
                        {swapAmount && (
                            <div className="premium-card p-3 bg-blue-500/5 border-blue-500/20">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-blue-400">
                                        <p className="font-medium mb-1">Rate: 1 {swapFrom} = 1.02 {swapTo}</p>
                                        <p className="text-blue-500/70">Estimated gas fee: $2.50</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Swap Button */}
                        <Button onClick={submitSwap} disabled={swapMutation.isPending || !swapAmount || swapFrom === swapTo} className="btn-primary w-full h-11 rounded-lg">
                            <Repeat className="w-4 h-4 mr-2" />
                            Swap Assets
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
