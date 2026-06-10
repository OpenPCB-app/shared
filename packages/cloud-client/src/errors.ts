import type { ProblemDetails } from "@openpcb/contracts";

export type { ProblemDetails };

function isProblemDetails(body: unknown): body is ProblemDetails {
  return (
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    "title" in body
  );
}

/**
 * Thrown for any non-2xx response from cloud-api. Carries the HTTP status and,
 * when the server returned an RFC-7807 body, the parsed {@link ProblemDetails}
 * (the same shape cloud-api emits from its `AppError` hierarchy).
 */
export class CloudApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly problem: ProblemDetails | null;
  readonly body: unknown;

  constructor(status: number, path: string, body: unknown) {
    const problem = isProblemDetails(body) ? body : null;
    super(problem?.title ?? `Cloud API ${status} ${path}`);
    this.name = "CloudApiError";
    this.status = status;
    this.path = path;
    this.problem = problem;
    this.body = body;
  }
}
