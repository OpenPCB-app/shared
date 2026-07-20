// GENERATED FILE — DO NOT EDIT.
//
// Source: ../../schemas/copilot/*.schema.json (vendored from cloud-copilot's
// `contracts/` — see that dir's README.md for provenance + sync instructions).
//
// Regenerate with `npm run gen --workspace packages/contracts` after
// re-vendoring; `npm run gen:check --workspace packages/contracts` fails CI
// on drift. These are the canonical TS types for the R2 tool plane (manifest +
// tool request/response shapes) — the desktop remote-tool adapters (R4) and
// any web consumer import them from @openpcb/contracts.

export interface AbsMax {
  vddMaxV?: number | null;
  tjMaxC?: number | null;
}

export interface ComponentSearchResult {
  componentId: string;
  name?: string | null;
  score: number;
}

export interface ErrorDetail {
  code: string;
  message: string;
  sha256?: string | null;
}

export interface FactsPayload {
  package?: string | null;
  absMax?: AbsMax | null;
  operating?: Operating | null;
  perPin?: PerPin[];
  thermal?: Thermal | null;
}

export interface LlmModelEntry {
  id: string;
  object?: "model";
  owned_by?: string;
  default?: boolean;
}

export interface Operating {
  vddMinV?: number | null;
  vddMaxV?: number | null;
  tempMinC?: number | null;
  tempMaxC?: number | null;
}

export interface OwnerRef {
  kind: "component" | "design";
  workspaceId: string;
  id: string;
  primary?: boolean;
}

export interface PerPin {
  pinNumber: string;
  maxCurrentMa?: number | null;
  fiveVoltTolerant?: boolean | null;
}

export interface PinSuggestion {
  pinNumber: string;
  pinName?: string | null;
  signalType?: "digital" | "analog" | "power" | "ground" | "clock" | "rf" | "diff-pair" | "high-speed" | "mixed" | "unknown";
  confidence?: number;
  rationale?: string | null;
  page?: number | null;
}

/**
 * AiPromptContextBlock parity (memory/selection.to_blocks output).
 */
export interface PromptContextBlock {
  id: string;
  title: string;
  content: string;
  priority: number;
}

export interface SearchExcerpt {
  sha256: string;
  page: number;
  ord: number;
  content: string;
  score: number;
  mpn?: string | null;
}

/**
 * AiSourceRef parity (ai-core source-ref.ts): id required, kind 'file'.
 */
export interface SourceRef {
  id: string;
  kind?: string;
  label?: string | null;
  refId?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface StorageRef {
  bucket: string;
  key: string;
}

export interface SymbolPin {
  pinNumber: string;
  pinName?: string | null;
  electricalType?: string | null;
}

export interface Thermal {
  thetaJaCPerW?: number | null;
}

export interface ToolManifestEntry {
  name: string;
  version: string;
  inputSchemaRef: string;
  outputSchemaRef: string;
  pricing: ToolPricing;
  durationClass: "fast" | "slow";
  authScope: "pro" | "workspace-viewer" | "workspace-editor";
  minClientVersion?: string | null;
}

export interface ToolPricing {
  unit: "call";
  credits: number;
}

export interface BlobStatusResponse {
  sha256: string;
  status: "registered" | "queued" | "fetching" | "extracting" | "embedding" | "done" | "failed";
  pageCount?: number | null;
  ocrUsed?: boolean;
  lang?: string | null;
  attempts?: number;
  failureReason?: string | null;
}

export interface ComponentSearchRequest {
  query: string;
  count?: number;
}

export interface ComponentSearchResponse {
  results: ComponentSearchResult[];
}

export interface DatasheetExtractRequest {
  kind: "pins" | "facts";
  workspaceId: string;
  sha256?: string | null;
  mpn?: string;
  componentId?: string | null;
  designId?: string | null;
  symbolPins?: SymbolPin[] | null;
}

export interface DatasheetExtractResponse {
  status: "ready" | "preparing";
  modelVersion?: string | null;
  sha256?: string | null;
  pins?: PinSuggestion[] | null;
  facts?: FactsPayload | null;
  sha256s?: string[];
  streamUrl?: string | null;
}

export interface DatasheetSearchRequest {
  query: string;
  workspaceId: string;
  scope?: "design" | "library";
  componentId?: string | null;
  designId?: string | null;
  mpn?: string | null;
  sha256s?: string[];
  count?: number;
  includeOlderRevisions?: boolean;
}

export interface DatasheetSearchResponse {
  status: "ready" | "preparing";
  excerpts?: SearchExcerpt[];
  sources?: SourceRef[];
  sha256s?: string[];
  preparingSha256s?: string[];
  failedSha256s?: string[];
  streamUrl?: string | null;
}

export interface ErrorBody {
  error: ErrorDetail;
}

export interface LlmModelList {
  object?: "list";
  data: LlmModelEntry[];
}

export interface MemoryGetBlocksRequest {
  workspaceId: string;
  designId?: string | null;
  runKind?: string;
  refTerms?: string[];
  maxTokens?: number;
}

export interface MemoryGetBlocksResponse {
  blocks: PromptContextBlock[];
}

export interface MemoryRecordRequest {
  workspaceId: string;
  designId?: string | null;
  key: string;
  value?: unknown;
  source?: "user" | "agent";
}

export interface MemoryRecordResponse {
  id: string;
  scope: "org" | "design";
  key: string;
}

export interface RefRequest {
  kind: "component" | "design";
  workspaceId: string;
  id: string;
  sha256: string;
  primary?: boolean;
}

export interface RegisterRequest {
  sha256: string;
  byteSize: number;
  source: "user-upload" | "vendor-fetch" | "core-authored";
  visibility: "global" | "private";
  storage?: StorageRef | null;
  sourceUrl?: string | null;
  mpn?: string | null;
  manufacturer?: string | null;
  title?: string | null;
  license?: string | null;
  owner?: OwnerRef | null;
}

export interface RegisterResponse {
  sha256: string;
  status: "registered" | "queued" | "fetching" | "extracting" | "embedding" | "done" | "failed";
  alreadyIngested: boolean;
}

export interface ToolManifest {
  apiVersion?: string;
  pricingVersion: string;
  tools: ToolManifestEntry[];
}
