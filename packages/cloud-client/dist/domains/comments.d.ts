import type { HttpClient } from "../http.js";
import type { CommentAttachment, CommentCommandEnvelope, CommentCommandResult, CommentSurface, CommentThread } from "../types.js";
export interface ListCommentsOptions {
    surface?: CommentSurface;
}
export declare class CommentsApi {
    #private;
    constructor(http: HttpClient);
    list(designId: string, opts?: ListCommentsOptions): Promise<{
        threads: CommentThread[];
    }>;
    getThread(designId: string, threadId: string): Promise<{
        thread: CommentThread;
    }>;
    dispatch(designId: string, envelope: CommentCommandEnvelope): Promise<CommentCommandResult>;
    uploadScreenshot(designId: string, input: {
        attachmentId?: string;
        threadId: string;
        messageId?: string | null;
        fileName: string;
        mimeType: "image/png" | "image/jpeg" | "image/webp";
        base64: string;
    }): Promise<{
        attachment: CommentAttachment;
    }>;
}
//# sourceMappingURL=comments.d.ts.map