"use client";

import { Badge } from "./ui";

export function OutcomeBadge({ status }: { status: string }) {
  if (status === "open") return <Badge tone="amber">Open</Badge>;
  if (status === "cleared") return <Badge tone="green">Cleared</Badge>;
  if (status === "violation") return <Badge tone="red">Violation</Badge>;
  return <Badge>Superseded</Badge>;
}
