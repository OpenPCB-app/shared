import type { HttpClient } from "../http.js";
import type {
  CommentAttachment,
  CommentCommandEnvelope,
  CommentCommandResult,
  CommentSurface,
  CommentThread,
} from "../types.js";

export interface ListCommentsOptions {
  surface?: CommentSurface;
}

export class CommentsApi {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(
    designId: string,
    opts: ListCommentsOptions = {},
  ): Promise<{ threads: CommentThread[] }> {
    const qs = new URLSearchParams();
    if (opts.surface) qs.set("surface", opts.surface);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.#http.get<{ threads: CommentThread[] }>(
      `/v1/designs/${designId}/comments${suffix}`,
    );
  }

  getThread(designId: string, threadId: string): Promise<{ thread: CommentThread }> {
    return this.#http.get<{ thread: CommentThread }>(
      `/v1/designs/${designId}/comments/${threadId}`,
    );
  }

  dispatch(
    designId: string,
    envelope: CommentCommandEnvelope,
  ): Promise<CommentCommandResult> {
    return this.#http.post<CommentCommandResult>(
      `/v1/designs/${designId}/comments/commands`,
      envelope,
    );
  }

  uploadScreenshot(
    designId: string,
    input: {
      attachmentId?: string;
      threadId: string;
      messageId?: string | null;
      fileName: string;
      mimeType: "image/png" | "image/jpeg" | "image/webp";
      base64: string;
    },
  ): Promise<{ attachment: CommentAttachment }> {
    return this.#http.post<{ attachment: CommentAttachment }>(
      `/v1/designs/${designId}/comments/attachments`,
      input,
    );
  }
}
