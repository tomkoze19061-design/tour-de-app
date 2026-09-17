import { getTeamInfo } from "@/lib/db";

export default function Footer() {
  const { teamName, members } = getTeamInfo();

  return (
    <footer className="mt-auto bg-brand-black text-brand-white">
      <div className="mx-auto max-w-5xl px-6 py-6 text-sm">
        <p className="font-semibold text-brand-green">{teamName}</p>
        <p className="text-brand-white/70">{members.join(", ")}</p>
      </div>
    </footer>
  );
}
