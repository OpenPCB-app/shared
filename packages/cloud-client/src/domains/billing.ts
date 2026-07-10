import type {
  BillingPlan,
  BillingTransaction,
  SubscriptionView,
  TopupRequest,
  TopupResult,
  UsageSummary,
  WalletBalance,
} from "@openpcb/contracts";
import type { HttpClient } from "../http.js";

/**
 * Billing, plans, wallet + usage (`/v1/billing`). cloud-api serves money +
 * subscription reads and dummy top-ups directly, and proxies usage/wallet to
 * cloud-copilot so the dashboard has one base URL.
 */
export class BillingApi {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Catalog of purchasable plans. */
  listPlans(): Promise<BillingPlan[]> {
    return this.#http.get<BillingPlan[]>("/v1/billing/plans");
  }

  /** The workspace's current subscription. */
  getSubscription(ws: string): Promise<SubscriptionView> {
    return this.#http.get<SubscriptionView>(
      `/v1/billing/workspaces/${ws}/subscription`,
    );
  }

  /** Switch the workspace to `planId` (admin only). */
  setPlan(ws: string, planId: string): Promise<SubscriptionView> {
    return this.#http.request<SubscriptionView>(
      `/v1/billing/workspaces/${ws}/subscription`,
      { method: "PUT", body: JSON.stringify({ planId }) },
    );
  }

  /** Purchase credits via the dummy payment provider (admin only). */
  topUp(ws: string, req: TopupRequest): Promise<TopupResult> {
    return this.#http.post<TopupResult>(
      `/v1/billing/workspaces/${ws}/topups`,
      req,
    );
  }

  /** Ledger of billing transactions (top-ups, grants, charges, refunds). */
  listTransactions(ws: string): Promise<BillingTransaction[]> {
    return this.#http.get<BillingTransaction[]>(
      `/v1/billing/workspaces/${ws}/transactions`,
    );
  }

  /** Usage summary for `period` (billing month `YYYY-MM`; defaults server-side). */
  getUsage(ws: string, period?: string): Promise<UsageSummary> {
    const query = period ? `?period=${encodeURIComponent(period)}` : "";
    return this.#http.get<UsageSummary>(
      `/v1/billing/workspaces/${ws}/usage${query}`,
    );
  }

  /** Current wallet balance + enforcement thresholds. */
  getWallet(ws: string): Promise<WalletBalance> {
    return this.#http.get<WalletBalance>(
      `/v1/billing/workspaces/${ws}/wallet`,
    );
  }
}
