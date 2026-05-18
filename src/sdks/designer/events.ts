import type { AggregateInvalidatedEvent } from "@openpcb/command-pattern";

export interface DesignerInvalidatedEvent extends AggregateInvalidatedEvent {
  moduleId: "designer";
}
