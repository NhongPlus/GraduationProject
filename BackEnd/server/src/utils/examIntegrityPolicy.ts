/** Khớp MAX_INTEGRITY_STRIKES trên client — đủ số lần thì server có thể tự nộp phiên. */
export const MAX_INTEGRITY_STRIKES = 3;

/** Các event_type được tính là một lần vi phạm / cảnh cáo. */
export const STRIKE_EVENT_TYPES = [
  "fullscreen_exit",
  "visibility_hidden",
  "window_blur",
  "window_focus",
  "tab_switch",
  "devtools_open",
  "copy_attempt",
  "paste_attempt",
  "context_menu",
  "before_unload",
  "other",
] as const;

export function shouldAutoSubmitByViolationCount(count: number): boolean {
  return count >= MAX_INTEGRITY_STRIKES;
}
