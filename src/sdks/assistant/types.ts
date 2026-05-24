import type {
  AiContextBinding,
  AiContextBindingKind,
  AiContextBindingRole,
  AiContextBindingStatus,
  AiContextSizePreference,
  AiProviderCapabilities,
  AiProviderKind,
  AiSourceRef,
  AiToolStatus,
} from "@openpcb/ai-core";

// Re-exports so consumers can import everything from @openpcb/contracts.
export type {
  AiContextBinding,
  AiContextBindingKind,
  AiContextBindingRole,
  AiContextBindingStatus,
  AiContextSizePreference,
  AiProviderCapabilities,
  AiProviderKind,
  AiSourceRef,
  AiToolStatus,
};

export type AssistantProviderId = string;
/** @deprecated Use AiProviderKind. Re-exported here for backward compatibility. */
export type AssistantProviderKind = AiProviderKind;
export type AssistantRole = "system" | "user" | "assistant" | "tool";

export type AssistantPromptPresetId =
  | "strict-grounded"
  | "friendly-tutorial"
  | "minimal-concise";

export type AssistantToolExecutionPolicy =
  | "auto_readonly_confirm_writes"
  | "confirm_all_writes"
  | "auto_all";

export interface AssistantPromptPreset {
  id: AssistantPromptPresetId;
  label: string;
  description: string;
}

export interface AssistantChat {
  id: string;
  title: string;
  providerConfigId: string;
  model: string;
  promptPresetId: AssistantPromptPresetId;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface AssistantToolCallSummary {
  toolCallId: string;
  toolName: string;
  status: AiToolStatus;
  sourceCount: number;
  truncated: boolean;
  warnings: string[];
}

export interface AssistantMessageMetadata {
  ai?: {
    toolCallSummaries?: AssistantToolCallSummary[];
    totalSources?: number;
  };
  [key: string]: unknown;
}

export interface AssistantMessage {
  id: string;
  chatId: string;
  role: AssistantRole;
  content: string;
  toolCallId: string | null;
  toolCallsJson: string | null;
  toolName: string | null;
  taskId: string | null;
  metadata: AssistantMessageMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantContextBindingDto extends AiContextBinding {
  chatId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantToolEventDto {
  id: string;
  chatId: string;
  taskId: string | null;
  messageId: string | null;
  toolCallId: string;
  toolName: string;
  status: AiToolStatus;
  argumentsJson: string;
  resultJson: string | null;
  errorJson: string | null;
  sources: AiSourceRef[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssistantChatInput {
  title?: string;
  providerConfigId?: string;
  model?: string;
  promptPresetId?: AssistantPromptPresetId;
}

export interface SubmitAssistantMessageInput {
  content: string;
  providerConfigId?: string;
  model?: string;
  promptPresetId?: AssistantPromptPresetId;
}

export interface SubmitAssistantMessageResult {
  chat: AssistantChat;
  userMessage: AssistantMessage;
  assistantMessage: AssistantMessage;
  taskId: string;
}

export interface AssistantSettings {
  defaultProviderId: string;
  defaultPromptPresetId: AssistantPromptPresetId;
  contextSizePreference: AiContextSizePreference;
  allowRawToolData: boolean;
  toolExecutionPolicy: AssistantToolExecutionPolicy;
}

export interface AssistantProviderConfig {
  id: string;
  label: string;
  kind: AiProviderKind;
  baseUrl: string;
  defaultModel: string;
  enabled: boolean;
  isBuiltin: boolean;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  capabilities: AiProviderCapabilities | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantProviderConfigInput {
  label?: string;
  kind?: AiProviderKind;
  baseUrl?: string;
  apiKey?: string;
  clearApiKey?: boolean;
  defaultModel?: string;
  enabled?: boolean;
}

export interface AssistantProviderModel {
  providerId: string;
  modelId: string;
  displayName: string | null;
  fetchedAt: string;
}

export interface ProviderTestResult {
  ok: boolean;
  checkedAt: string;
  modelsAvailable: number;
  completionTested: boolean;
  toolCallSupported: boolean;
  message: string;
}

export interface AssistantSDK {
  // Chats
  createChat(input?: CreateAssistantChatInput): Promise<AssistantChat>;
  listChats(): Promise<AssistantChat[]>;
  getChat(chatId: string): Promise<AssistantChat | null>;
  deleteChat(chatId: string): Promise<void>;
  listMessages(chatId: string): Promise<AssistantMessage[]>;
  submitMessage(
    chatId: string,
    input: SubmitAssistantMessageInput,
  ): Promise<SubmitAssistantMessageResult>;

  // Prompts
  listPromptPresets(): Promise<AssistantPromptPreset[]>;

  // Context bindings
  listContextBindings(chatId: string): Promise<AssistantContextBindingDto[]>;
  deleteContextBinding(chatId: string, bindingId: string): Promise<void>;

  // Tool events
  listToolEvents(
    chatId: string,
    options?: { messageId?: string },
  ): Promise<AssistantToolEventDto[]>;

  // Settings
  getSettings(): Promise<AssistantSettings>;
  updateSettings(input: Partial<AssistantSettings>): Promise<AssistantSettings>;

  // Providers
  listProviders(): Promise<AssistantProviderConfig[]>;
  createProvider(
    input: AssistantProviderConfigInput,
  ): Promise<AssistantProviderConfig>;
  updateProvider(
    id: string,
    input: AssistantProviderConfigInput,
  ): Promise<AssistantProviderConfig>;
  deleteProvider(id: string): Promise<void>;
  listProviderModels(id: string): Promise<AssistantProviderModel[]>;
  refreshProviderModels(id: string): Promise<AssistantProviderModel[]>;
  testProvider(
    id: string,
    input?: { includeCompletion?: boolean },
  ): Promise<ProviderTestResult>;
  getProviderCapabilities(id: string): Promise<AiProviderCapabilities | null>;
  refreshProviderCapabilities(id: string): Promise<AiProviderCapabilities>;
}
