import Link from "next/link";
import type { Line } from "@/lib/lines";
import { readableTextColor } from "@/lib/lineDisplay";

type Props = {
  lines: Line[];
  size?: "sm" | "md";
};

// Řada barevných odznaků linek -- každý vede na detail linky.
export default function LineLinks({ lines, size = "sm" }: Props) {
  if (lines.length === 0) return null;

  const sizeClasses =
    size === "md" ? "h-9 min-w-9 text-base" : "h-7 min-w-7 text-sm";

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Linky na zastávce">
      {lines.map((line) => (
        <li key={line.id}>
          <Link
            href={`/lines/${line.id}`}
            className={`inline-flex items-center justify-center rounded-lg px-1.5 font-bold transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${sizeClasses}`}
            style={{
              backgroundColor: line.color,
              color: readableTextColor(line.color),
            }}
            title={`Linka ${line.number} – ${line.name}`}
            aria-label={`Linka ${line.number} – ${line.name}`}
          >
            {line.number}
          </Link>
        </li>
      ))}
    </ul>
  );
}
