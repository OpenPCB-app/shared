import type { BillingPlan, BillingTransaction, SubscriptionView, TopupRequest, TopupResult, UsageSummary, WalletBalance } from "@openpcb/contracts";
import type { HttpClient } from "../http.js";
/**
 * Billing, plans, wallet + usage (`/v1/billing`). cloud-api serves money +
 * subscription reads and dummy top-ups directly, and proxies usage/wallet to
 * cloud-copilot so the dashboard has one base URL.
 */
export declare class BillingApi {
    #private;
    constructor(http: HttpClient);
    /** Catalog of purchasable plans. */
    listPlans(): Promise<BillingPlan[]>;
    /** The workspace's current subscription. */
    getSubscription(ws: string): Promise<SubscriptionView>;
    /** Switch the workspace to `planId` (admin only). */
    setPlan(ws: string, planId: string): Promise<SubscriptionView>;
    /** Purchase credits via the dummy payment provider (admin only). */
    topUp(ws: string, req: TopupRequest): Promise<TopupResult>;
    /** Ledger of billing transactions (top-ups, grants, charges, refunds). */
    listTransactions(ws: string): Promise<BillingTransaction[]>;
    /** Usage summary for `period` (billing month `YYYY-MM`; defaults server-side). */
    getUsage(ws: string, period?: string): Promise<UsageSummary>;
    /** Current wallet balance + enforcement thresholds. */
    getWallet(ws: string): Promise<WalletBalance>;
}
//# sourceMappingURL=billing.d.ts.map