export const MODULE_SDK_TOKENS = {
  LIBRARY: "LibrarySDK",
  DESIGNER: "DesignerSDK",
  TASKS: "TasksSDK",
  ASSISTANT: "AssistantSDK",
} as const;

export type ModuleSdkToken =
  (typeof MODULE_SDK_TOKENS)[keyof typeof MODULE_SDK_TOKENS];

export * from "./library/index.js";
export * from "./designer/index.js";
export * from "./tasks/index.js";
export * from "./assistant/index.js";
