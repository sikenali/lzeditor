/** The AI request gate, no-op shim: requests always allowed. */
export const AI_OFF = "textus-ai-off";
export function gateAiRequests(_read: () => boolean): void {}
export function aiRequestsAllowed(): boolean {
  return true;
}
