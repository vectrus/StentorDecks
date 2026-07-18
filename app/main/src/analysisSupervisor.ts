/**
 * Stub for E5 — analysis window created lazily later.
 * E1 only exposes the supervisor hook so main can call ensureAnalysisWindow().
 */
export type AnalysisSupervisor = {
  ensureAnalysisWindow: () => void;
  destroy: () => void;
};

export function createAnalysisSupervisor(): AnalysisSupervisor {
  let created = false;
  return {
    ensureAnalysisWindow() {
      if (created) return;
      created = true;
      console.info('[analysis] supervisor stub — window will be created in E5');
    },
    destroy() {
      created = false;
    },
  };
}
