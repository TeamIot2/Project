import type { EnvironmentMode } from "../types";

const MOCK_MODE_IDS = new Set<EnvironmentMode>(["sport", "outdoor", "school", "factory"]);

export function withMockModeSuffix(modeId: EnvironmentMode, label: string): string {
  const normalizedLabel = label.trim();
  if (!MOCK_MODE_IDS.has(modeId)) return normalizedLabel;
  return normalizedLabel.endsWith("(M)") ? normalizedLabel : `${normalizedLabel}(M)`;
}
