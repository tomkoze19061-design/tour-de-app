import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-brand-blue text-brand-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-white text-brand-blue font-bold"
          >
            T
          </span>
          <span className="text-lg font-semibold tracking-wide">
            Think different Academy
          </span>
        </Link>

        <nav className="flex gap-6 text-sm font-medium">
          <Link href="/stops" className="hover:text-brand-green">
            Zastávky
          </Link>
          <Link href="/lines" className="hover:text-brand-green">
            Linky
          </Link>
        </nav>
      </div>
    </header>
  );
}
