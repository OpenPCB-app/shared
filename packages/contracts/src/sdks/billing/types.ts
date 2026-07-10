/**
 * Billing + usage wire contracts (P2/P3).
 *
 * Usage/wallet reads are served by cloud-copilot (`/v1/copilot/usage`, `/wallet`);
 * money/subscription reads + dummy top-ups by cloud-api (`/v1/billing/*`). cloud-api
 * proxies usage/wallet so the dashboard has one base URL. Money is stored as `numeric`
 * server-side; these numbers are display-precision floats.
 */

// ── usage reporting (copilot GET /v1/copilot/usage) ─────────────────────────

export interface UsageTotals {
  creditUnits: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  events: number;
}

export interface UsageServiceBreakdown {
  service: string;
  creditUnits: number;
  costUsd: number;
  events: number;
}

export interface UsageDayPoint {
  usageDay: string; // ISO date
  creditUnits: number;
  costUsd: number;
}

export interface UsageUserBreakdown {
  userId: string;
  creditUnits: number;
  costUsd: number;
  events: number;
}

export interface UsageSummary {
  workspaceId: string;
  /** Billing month, `YYYY-MM`. */
  period: string;
  /** `workspace` (admin: org-wide + byUser) or `self` (own usage only). */
  scope: "workspace" | "self";
  totals: UsageTotals;
  byService: UsageServiceBreakdown[];
  byDay: UsageDayPoint[];
  /** Per-user breakdown — populated for admins only. */
  byUser: UsageUserBreakdown[];
}

// ── wallet (copilot GET /v1/copilot/workspaces/:ws/wallet) ──────────────────

export interface WalletBalance {
  workspaceId: string;
  /** True when no wallet is configured → enforcement disabled (free/unmetered). */
  unlimited: boolean;
  /** Remaining credits, or null when `unlimited`. */
  balanceCredits: number | null;
  lowBalanceThreshold?: number | null;
  hardStopAt?: number | null;
  seatCreditLimit?: number | null;
  lowBalance?: boolean;
}

// ── plans + subscription + dummy payment (cloud-api /v1/billing/*) ───────────

export type BillingMode = "passthrough_usd" | "allowance_overage";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

export interface BillingPlan {
  id: string;
  name: string;
  billingMode: BillingMode;
  monthlyPriceUsd: number;
  includedCredits: number;
  creditPriceUsd: number;
  /** null ⇒ hard-block at exhaustion (no overage). */
  overageCreditPriceUsd: number | null;
  perSeatCreditCap: number | null;
  seatPriceUsd: number;
  spendCapUsd: number | null;
}

export interface SubscriptionView {
  workspaceId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  includedCredits: number;
  seatLimit: number | null;
  currentPeriodEnd: string; // ISO date
  provider: string; // "dummy" | "stripe"
}

export interface TopupRequest {
  credits: number;
}

export interface TopupResult {
  transactionId: string;
  status: "succeeded" | "failed";
  newBalanceCredits: number;
}

export interface BillingTransaction {
  id: string;
  workspaceId: string;
  kind: "topup" | "grant" | "charge" | "refund";
  amountUsd: number;
  credits: number;
  status: string;
  createdAt: string;
}
