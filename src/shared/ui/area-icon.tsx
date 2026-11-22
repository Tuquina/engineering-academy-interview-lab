import { createElement } from "react";
import { areaIcon } from "./area-tone";

/** Ícono del área de conocimiento (ver `areaIcon`); decorativo, acompaña siempre al nombre del área. */
export function AreaIcon({ areaId, className }: { areaId: string | undefined; className?: string }) {
  return createElement(areaIcon(areaId), { "aria-hidden": true, className });
}
