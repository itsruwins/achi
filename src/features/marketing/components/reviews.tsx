import { Badge } from "@/components/ui/chip";
import { cn } from "@/lib/utils/cn";

/**
 * Social-proof band.
 *
 * ⚠️ The quotes below are PLACEHOLDER COPY, not real reviews. Achi has no users
 * to quote yet, and inventing named endorsements would be a fabricated
 * testimonial — so the attributions are course/year only, and the section
 * carries a visible "Sample layout" badge that has to be removed deliberately.
 *
 * To ship this for real: replace `FEATURED` and `QUOTES` with quotes you have
 * permission to use, add the real names, and delete the badge along with the
 * `sample` flag below.
 */
const SAMPLE = true;

const FEATURED = {
  quote:
    "I dumped a whole semester of biochem notes in and had a deck before I finished my coffee. The part that actually mattered was the scheduling — I stopped re-reading chapters I already knew and the exam was the first one I didn't cram for.",
  emphasis: "stopped re-reading chapters I already knew",
  role: "BS Biochemistry, 3rd year",
  stats: [
    ["214", "cards from one upload"],
    ["18s", "to draft the deck"],
  ] as [string, string][],
};

const QUOTES: { quote: string; role: string }[] = [
  {
    quote:
      "The tutor explains why an answer is right instead of just handing it over. It reads the deck, so it never wanders off topic.",
    role: "1st year Law",
  },
  {
    quote:
      "I brought my old Anki deck over in one file and kept every tag. Didn't have to rebuild anything.",
    role: "BSCS, 2nd year",
  },
  {
    quote:
      "Ten minutes on the jeep in the morning clears everything due. That's the whole study session now.",
    role: "BS Psychology, 4th year",
  },
];

export function Reviews() {
  return (
    <section className="band-dark border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 lg:py-20">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Why people keep the tab open
          </h2>
          {SAMPLE ? (
            <Badge tone="warning">Sample layout — quotes are placeholders</Badge>
          ) : null}
        </div>

        {/* Featured quote gets its own weight class: one long quote reads, five
            of the same length becomes wallpaper. */}
        <figure className="mt-8 grid gap-5 rounded-card border border-border bg-surface p-6 lg:grid-cols-[1fr_auto] lg:gap-10 lg:p-8">
          <div>
            <blockquote className="text-lg leading-relaxed text-text sm:text-xl">
              <Emphasised text={FEATURED.quote} emphasis={FEATURED.emphasis} />
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-2.5">
              <Initials />
              <span className="text-base text-muted">{FEATURED.role}</span>
            </figcaption>
          </div>

          <div className="flex gap-6 self-start rounded-card border border-border bg-sunken p-4 lg:flex-col lg:gap-4">
            {FEATURED.stats.map(([figure, label]) => (
              <div key={label}>
                <p className="tnum text-2xl font-semibold tracking-tight text-primary">
                  {figure}
                </p>
                <p className="text-sm text-subtle">{label}</p>
              </div>
            ))}
          </div>
        </figure>

        <ul className="mt-3 grid gap-3 lg:grid-cols-3">
          {QUOTES.map((item) => (
            <li key={item.role}>
              <figure className="flex h-full flex-col rounded-card border border-border bg-surface p-5">
                <blockquote className="flex-1 text-base leading-relaxed text-text">
                  {item.quote}
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-2.5">
                  <Initials />
                  <span className="text-sm text-muted">{item.role}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Bolds one clause inside the quote.
 *
 * Split on the exact substring rather than storing markup in the string — the
 * quote stays plain text, so it can't carry anything unescaped.
 */
function Emphasised({ text, emphasis }: { text: string; emphasis: string }) {
  const at = text.indexOf(emphasis);
  if (at === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <em className="font-medium not-italic text-primary">{emphasis}</em>
      {text.slice(at + emphasis.length)}
    </>
  );
}

/**
 * Deliberately not initials of an invented name — a neutral mark, because the
 * quotes are placeholders and a fake monogram would imply a real person.
 */
function Initials({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-pill border border-border bg-sunken text-subtle",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="9" r="3.2" />
        <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
      </svg>
    </span>
  );
}
