/**
 * Cloud Copilot wire contracts (S5).
 *
 * The stream frame is PYTHON-CANONICAL: `cloud-copilot/app/contracts/stream_frame.py`
 * generates `contracts/CopilotStreamFrame.schema.json`, vendored here as
 * `tests/fixtures/CopilotStreamFrame.schema.json` with a drift test. Update the
 * fixture from the cloud-copilot repo when the frame contract changes.
 *
 * The 11 `run.*` frame names are string-identical to `AiRunEventType`
 * (`@openpcb/ai-core`); the 6 copilot-only frames have no AiRunEventType
 * equivalent and are handled on a dedicated branch by the desktop frame mapper.
 */

/** All SSE frame types emitted by `GET /v1/copilot/runs/:id/stream`. */
export type CopilotStreamFrameType =
  | "run.started"
  | "run.message.delta"
  | "run.message.completed"
  | "run.tool.requested"
  | "run.tool.running"
  | "run.tool.succeeded"
  | "run.tool.failed"
  | "run.warning"
  | "run.completed"
  | "run.failed"
  | "run.cancelled"
  | "run.awaiting.approval"
  | "copilot.task.updated"
  | "copilot.proposal.created"
  | "copilot.plan.created"
  | "copilot.plan.updated"
  | "copilot.plan.checkpoint";

/** The 11 frame types shared verbatim with `AiRunEventType` (@openpcb/ai-core). */
export type CopilotSharedRunFrameType =
  | "run.started"
  | "run.message.delta"
  | "run.message.completed"
  | "run.tool.requested"
  | "run.tool.running"
  | "run.tool.succeeded"
  | "run.tool.failed"
  | "run.warning"
  | "run.completed"
  | "run.failed"
  | "run.cancelled";

/**
 * The 6 copilot-only frame types with no AiRunEventType equivalent
 * (`run.awaiting.approval` + the `copilot.*` frames).
 */
export type CopilotOnlyFrameType = Exclude<
  CopilotStreamFrameType,
  CopilotSharedRunFrameType
>;

export interface CopilotStreamFrame {
  type: CopilotStreamFrameType;
  runId: string;
  /** Monotonic per-run sequence — SSE `id:`; resume via `Last-Event-ID`. */
  seq: number;
  stepId?: string | null;
  data: Record<string, unknown>;
}

// ── runs ──────────────────────────────────────────────────────────────────────

export type CopilotRunKind = "explain" | "review" | "edit" | "agent";
export type CopilotModelTier = "fast" | "reasoning";

export type CopilotRunStatus =
  | "queued"
  | "planning"
  | "running"
  | "awaiting_approval"
  | "awaiting_input"
  | "completed"
  | "failed"
  | "cancelled";

/** `POST /v1/copilot/runs` request body. */
export interface CreateCopilotRunRequest {
  designId: string;
  kind: CopilotRunKind;
  goal?: string | null;
  modelTier?: CopilotModelTier;
  /** kind `agent`: park in `awaiting_approval` after planning for user review. */
  approvePlan?: boolean;
}

/** `POST /v1/copilot/runs` response. */
export interface CreateCopilotRunResponse {
  runId: string;
  status: CopilotRunStatus;
}

// ── plan-as-data ──────────────────────────────────────────────────────────────

export type CopilotTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";
export type CopilotTaskMode = "agent" | "deterministic" | "planning";

/** One plan step as returned by `GET /v1/copilot/runs/:id/plan`. */
export interface CopilotPlanTask {
  taskId: string;
  seq: number;
  title: string;
  status: CopilotTaskStatus;
  mode: CopilotTaskMode;
  checkpoint: boolean;
  locked: boolean;
  createdBy: string;
}

/** `GET /v1/copilot/runs/:id/plan` response. */
export interface CopilotPlanView {
  planRevision: number;
  status: CopilotRunStatus;
  tasks: CopilotPlanTask[];
}

export type CopilotPlanOpAction =
  | "add"
  | "edit"
  | "remove"
  | "reorder"
  | "lock"
  | "unlock";

/** One op in a `PATCH /v1/copilot/runs/:id/plan` request. */
export interface CopilotPlanOp {
  action: CopilotPlanOpAction;
  taskId?: string | null;
  afterTaskId?: string | null;
  atStart?: boolean;
  title?: string | null;
  instruction?: string | null;
  toolsKey?: string | null;
  checkpoint?: boolean | null;
}

/** `PATCH /v1/copilot/runs/:id/plan` request body (409 on revision CAS miss). */
export interface PatchCopilotPlanRequest {
  expectedPlanRevision: number;
  ops: CopilotPlanOp[];
  reason?: string | null;
}

/** `PATCH .../plan` and `POST .../plan/approve` success response. */
export interface CopilotPlanMutationResponse {
  planRevision: number;
  tasks: CopilotPlanTask[];
}

/**
 * `POST /v1/copilot/runs/:id/resume` request body (S7): release a run parked at a
 * plan checkpoint (`awaiting_input`). `message` = guidance for the next step,
 * delivered through the steer inbox. 409 when the run is not parked.
 */
export interface ResumeCopilotRunRequest {
  message?: string | null;
}

// ── proposals ─────────────────────────────────────────────────────────────────

export type CopilotProposalStatus =
  | "pending"
  | "applied"
  | "rejected"
  | "failed";

/**
 * One staged write proposal (`GET /v1/copilot/runs/:id/proposals`, and the
 * `copilot.proposal.created` frame's `data.proposal`). `kind` values match
 * `AssistantWriteProposalKind`; `operations`/`sources` follow the assistant
 * envelope shapes so the desktop can mirror rows into `assistant_write_proposal`.
 */
export interface CopilotProposalView {
  id: string;
  kind: string;
  riskLevel: "low" | "medium" | "high" | "destructive";
  status: CopilotProposalStatus;
  baseRevision: number | null;
  title: string | null;
  summary: string | null;
  operations: unknown[];
  sources: unknown[];
}

/** `POST /v1/copilot/runs/:id/proposals/:pid/applied` callback body (idempotent). */
export interface CopilotProposalAppliedRequest {
  revisionAfter?: number | null;
  retried?: boolean;
}
