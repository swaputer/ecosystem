import { formatEther } from "ethers";

export function formatWalletBalance(balance: bigint | null, loading = false): string {
  if (balance === null) return loading ? "…" : "—";
  const [whole, fraction = ""] = formatEther(balance).split(".");
  if (balance > 0n && whole === "0" && !fraction.slice(0, 4).replaceAll("0", "")) return "<0.0001";
  return `${whole}.${fraction.padEnd(4, "0").slice(0, 4)}`;
}
