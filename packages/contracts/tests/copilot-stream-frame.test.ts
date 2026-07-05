/**
 * Drift guard: the TS `CopilotStreamFrameType` union must stay in lockstep with the
 * Python-canonical frame contract. The fixture is the JSON Schema committed in
 * cloud-copilot (`contracts/CopilotStreamFrame.schema.json`, itself drift-tested
 * against the pydantic model). To update: copy the schema from cloud-copilot into
 * `tests/fixtures/` and extend the union.
 */
import { describe, expect, test } from "bun:test";
import type {
  CopilotOnlyFrameType,
  CopilotSharedRunFrameType,
  CopilotStreamFrame,
  CopilotStreamFrameType,
} from "../src/index.js";
import schema from "./fixtures/CopilotStreamFrame.schema.json";

// Compile-time exhaustiveness: a record keyed by the union must list every member.
const ALL_FRAME_TYPES: Record<CopilotStreamFrameType, true> = {
  "run.started": true,
  "run.message.delta": true,
  "run.message.completed": true,
  "run.tool.requested": true,
  "run.tool.running": true,
  "run.tool.succeeded": true,
  "run.tool.failed": true,
  "run.warning": true,
  "run.completed": true,
  "run.failed": true,
  "run.cancelled": true,
  "run.awaiting.approval": true,
  "copilot.task.updated": true,
  "copilot.proposal.created": true,
  "copilot.plan.created": true,
  "copilot.plan.updated": true,
};

const SHARED: Record<CopilotSharedRunFrameType, true> = {
  "run.started": true,
  "run.message.delta": true,
  "run.message.completed": true,
  "run.tool.requested": true,
  "run.tool.running": true,
  "run.tool.succeeded": true,
  "run.tool.failed": true,
  "run.warning": true,
  "run.completed": true,
  "run.failed": true,
  "run.cancelled": true,
};

const COPILOT_ONLY: Record<CopilotOnlyFrameType, true> = {
  "run.awaiting.approval": true,
  "copilot.task.updated": true,
  "copilot.proposal.created": true,
  "copilot.plan.created": true,
  "copilot.plan.updated": true,
};

describe("CopilotStreamFrame contract drift", () => {
  test("frame-type union matches the vendored Python-canonical schema exactly", () => {
    const schemaTypes = (schema.properties.type.enum as string[]).toSorted();
    expect(Object.keys(ALL_FRAME_TYPES).toSorted()).toEqual(schemaTypes);
  });

  test("shared + copilot-only partition covers the union with no overlap", () => {
    const shared = Object.keys(SHARED);
    const only = Object.keys(COPILOT_ONLY);
    expect(shared.length + only.length).toBe(Object.keys(ALL_FRAME_TYPES).length);
    expect(shared.filter((t) => only.includes(t))).toEqual([]);
  });

  test("frame shape matches the schema's required/optional fields", () => {
    expect(schema.required.toSorted()).toEqual(["runId", "seq", "type"]);
    const frame: CopilotStreamFrame = {
      type: "copilot.plan.created",
      runId: "run-1",
      seq: 7,
      data: { planRevision: 1 },
    };
    expect(frame.stepId ?? null).toBeNull();
    expect(Object.keys(schema.properties).toSorted()).toEqual(
      ["data", "runId", "seq", "stepId", "type"],
    );
  });
});
