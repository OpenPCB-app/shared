import type { ProblemDetails } from "@openpcb/contracts";
export type { ProblemDetails };
/**
 * Thrown for any non-2xx response from cloud-api. Carries the HTTP status and,
 * when the server returned an RFC-7807 body, the parsed {@link ProblemDetails}
 * (the same shape cloud-api emits from its `AppError` hierarchy).
 */
export declare class CloudApiError extends Error {
    readonly status: number;
    readonly path: string;
    readonly problem: ProblemDetails | null;
    readonly body: unknown;
    constructor(status: number, path: string, body: unknown);
}
//# sourceMappingURL=errors.d.ts.map