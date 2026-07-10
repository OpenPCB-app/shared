/**
 * Billing, plans, wallet + usage (`/v1/billing`). cloud-api serves money +
 * subscription reads and dummy top-ups directly, and proxies usage/wallet to
 * cloud-copilot so the dashboard has one base URL.
 */
export class BillingApi {
    #http;
    constructor(http) {
        this.#http = http;
    }
    /** Catalog of purchasable plans. */
    listPlans() {
        return this.#http.get("/v1/billing/plans");
    }
    /** The workspace's current subscription. */
    getSubscription(ws) {
        return this.#http.get(`/v1/billing/workspaces/${ws}/subscription`);
    }
    /** Switch the workspace to `planId` (admin only). */
    setPlan(ws, planId) {
        return this.#http.request(`/v1/billing/workspaces/${ws}/subscription`, { method: "PUT", body: JSON.stringify({ planId }) });
    }
    /** Purchase credits via the dummy payment provider (admin only). */
    topUp(ws, req) {
        return this.#http.post(`/v1/billing/workspaces/${ws}/topups`, req);
    }
    /** Ledger of billing transactions (top-ups, grants, charges, refunds). */
    listTransactions(ws) {
        return this.#http.get(`/v1/billing/workspaces/${ws}/transactions`);
    }
    /** Usage summary for `period` (billing month `YYYY-MM`; defaults server-side). */
    getUsage(ws, period) {
        const query = period ? `?period=${encodeURIComponent(period)}` : "";
        return this.#http.get(`/v1/billing/workspaces/${ws}/usage${query}`);
    }
    /** Current wallet balance + enforcement thresholds. */
    getWallet(ws) {
        return this.#http.get(`/v1/billing/workspaces/${ws}/wallet`);
    }
}
//# sourceMappingURL=billing.js.map