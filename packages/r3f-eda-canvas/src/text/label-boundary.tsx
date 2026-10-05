import { Component, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import type { EdaTextStatus } from "./runtime.js";

interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError: (error: Error) => void;
}

class LabelErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  override componentDidCatch(error: Error): void { this.props.onError(error); }
  override render(): ReactNode { return this.state.failed ? this.props.fallback : this.props.children; }
}

interface LabelBoundaryProps {
  timeoutMs: number;
  fallback: ReactNode;
  renderText: (onSync: () => void) => ReactNode;
  missingCodePoints: readonly number[];
  onStatus?: (status: EdaTextStatus) => void;
}

/** This component must remain outside the Text that suspends or never calls onSync. */
export function LabelBoundary({ timeoutMs, fallback, renderText, missingCodePoints, onStatus }: LabelBoundaryProps) {
  const invalidate = useThree((state) => state.invalidate);
  const [status, setStatus] = useState<EdaTextStatus>({ state: "pending" });
  const [synced, setSynced] = useState(false);
  const onSync = useCallback(() => {
    setSynced(true);
    setStatus((previous) => previous.state !== "pending" ? previous : missingCodePoints.length ? { state: "fallback", reason: "missing-glyph", missingCodePoints } : { state: "ready" });
  }, [missingCodePoints]);
  const onError = useCallback((error: Error) => {
    setStatus({ state: "fallback", reason: "text-error", error: error.message });
  }, []);
  useEffect(() => {
    if (synced || status.state !== "pending") return;
    const timer = setTimeout(() => setStatus({ state: "fallback", reason: "text-timeout" }), timeoutMs);
    return () => clearTimeout(timer);
  }, [synced, timeoutMs, status.state]);
  useEffect(() => { invalidate(); onStatus?.(status); }, [invalidate, onStatus, status]);
  if (status.reason === "text-timeout" || status.reason === "text-error") return fallback;
  return (
    <LabelErrorBoundary fallback={fallback} onError={onError}>
      {!synced && fallback}
      <Suspense fallback={null}>{renderText(onSync)}</Suspense>
    </LabelErrorBoundary>
  );
}
