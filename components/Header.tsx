export default function Header() {
  return (
    <header className="bg-brand-blue text-brand-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-white text-brand-blue font-bold"
        >
          T
        </span>
        <span className="text-lg font-semibold tracking-wide">
          Think different Academy
        </span>
      </div>
    </header>
  );
}
