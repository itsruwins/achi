import { cn } from "@/lib/utils/cn";

/**
 * The drenched band — the one full-colour section on the page.
 *
 * A big-number band on a product with no users would normally be the place
 * where sites invent a user count. These are all facts about what the software
 * does rather than how many people use it: they're checkable against the code,
 * they don't go stale, and they're the numbers a student actually weighs.
 *
 * Rows rather than a card grid: phrase left, figure right, hairline between —
 * so the eye reads a statement and lands on its number.
 */
const ROWS: { phrase: string; figure: string; label: string }[] = [
  {
    phrase: "Paste a chapter.",
    figure: "40k",
    label: "characters per generation",
  },
  {
    phrase: "Get cards back.",
    figure: "~20s",
    label: "to draft a full deck",
  },
  {
    phrase: "Then stop revising it.",
    figure: "10 yr",
    label: "longest interval a card can reach",
  },
];

const TAGS = [
  "Med",
  "Law",
  "Nursing",
  "Engineering",
  "Board exams",
  "Language",
];

export function StatBand() {
  return (
    <section className="band-brand">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 lg:py-20">
        <h2 className="font-display max-w-[20ch] text-3xl text-text sm:text-4xl">
          The whole loop, in three numbers
        </h2>

        <dl className="mt-10">
          {ROWS.map((row, index) => (
            // Explicitly stacked below sm rather than left to flex-wrap: a
            // wrapped right-aligned figure lands in a different place on every
            // row, depending on how long that row's phrase happens to be.
            <div
              key={row.phrase}
              className={cn(
                "border-t border-border py-6",
                "sm:flex sm:items-baseline sm:justify-between sm:gap-8 sm:py-7",
                index === ROWS.length - 1 && "border-b",
              )}
            >
              <dt className="font-display text-2xl text-text sm:text-3xl">
                {row.phrase}
              </dt>
              <dd className="mt-2 sm:mt-0 sm:text-right">
                <span className="tnum font-display block text-4xl leading-none text-text sm:text-5xl">
                  {row.figure}
                </span>
                <span className="mt-1.5 block text-sm text-subtle">
                  {row.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <ul className="mt-8 flex flex-wrap items-center gap-2">
          <li className="text-sm text-muted">Built for</li>
          {TAGS.map((tag) => (
            <li
              key={tag}
              className="rounded-pill border border-border bg-primary-subtle px-2.5 py-1 text-sm text-text"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
