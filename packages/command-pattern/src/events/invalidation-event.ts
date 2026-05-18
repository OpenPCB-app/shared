import type { Revision } from "../revision/revision.js";

export interface AggregateInvalidatedEvent {
  aggregateId: string;
  revision: Revision;
  at: number;
}
