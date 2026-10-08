import { readableTextColor } from "@/lib/lineDisplay";

type Props = {
  number: string;
  color: string;
  size?: "md" | "lg";
};

// Barevný odznak s označením linky (jako na plánku metra).
export default function LineBadge({ number, color, size = "md" }: Props) {
  const sizeClasses =
    size === "lg" ? "h-14 min-w-14 text-2xl" : "h-11 min-w-11 text-lg";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl px-2 font-bold ${sizeClasses}`}
      style={{ backgroundColor: color, color: readableTextColor(color) }}
      aria-label={`Linka ${number}`}
    >
      {number}
    </span>
  );
}
