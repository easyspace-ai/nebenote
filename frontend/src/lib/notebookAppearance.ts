import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Atom,
  BookOpen,
  Box,
  Database,
  Flame,
  Gem,
  Heart,
  Lightbulb,
  MapPin,
  PenLine,
  Sparkles,
  TreePine,
} from "lucide-react";

import type { Notebook } from "@/lib/api/client";

/** 与 web/src/lib/projectAppearance 一致：12 套图标 */
export const NOTEBOOK_ICON_PRESETS: Array<{ Icon: LucideIcon }> = [
  { Icon: MapPin },
  { Icon: BookOpen },
  { Icon: Atom },
  { Icon: Database },
  { Icon: Gem },
  { Icon: Heart },
  { Icon: TreePine },
  { Icon: PenLine },
  { Icon: Box },
  { Icon: Flame },
  { Icon: Lightbulb },
  { Icon: Sparkles },
];

const FALLBACK_BG: string[] = [
  "bg-zinc-600",
  "bg-neutral-600",
  "bg-stone-600",
  "bg-zinc-700",
  "bg-neutral-700",
  "bg-stone-500",
  "bg-zinc-500",
  "bg-neutral-500",
  "bg-stone-700",
  "bg-zinc-800",
  "bg-neutral-800",
  "bg-stone-800",
];

export function hashNotebookId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** DeerFlow Notebook 无 icon_index，按 notebook_id 稳定选图标与底色（对齐 web 的 fallback 行为） */
export function notebookTileFromNotebook(p: Pick<Notebook, "notebook_id">): {
  Icon: LucideIcon;
  bgClass: string;
  tileStyle?: CSSProperties;
} {
  const idx = hashNotebookId(p.notebook_id) % NOTEBOOK_ICON_PRESETS.length;
  const { Icon } = NOTEBOOK_ICON_PRESETS[idx]!;
  return { Icon, bgClass: FALLBACK_BG[idx]! };
}
