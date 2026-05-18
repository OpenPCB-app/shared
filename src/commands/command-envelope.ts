import type { Revision } from "../revision/revision.js";

export interface CommandEnvelope<TCommand> {
  commandId: string;
  sessionId: string;
  aggregateId: string;
  baseRevision: Revision | null;
  issuedAt: number;
  command: TCommand;
}
