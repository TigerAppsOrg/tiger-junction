/** ReCal records actual picks by section title in metadata.confirms. */
export function isSectionSelected(metadata: unknown, title: string): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const confirms = (metadata as { confirms?: unknown }).confirms;
  if (!confirms || typeof confirms !== "object" || Array.isArray(confirms)) return false;
  return Object.values(confirms).some((selected) => typeof selected === "string" && selected === title);
}
