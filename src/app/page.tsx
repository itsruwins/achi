import {
  Atkinson_Hyperlegible_Next,
  Shantell_Sans,
  Spline_Sans_Mono,
} from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  SketchArrow,
  SketchCheck,
  SketchConnector,
  SketchDefs,
  SketchUnderline,
} from "@/components/ui/sketch";
import { getSessionUser } from "@/features/auth/queries";
import { SketchCard } from "@/features/marketing/components/sketch-card";
import { cn } from "@/lib/utils/cn";

import "./sketch.css";

/**
 * Landing page — sketch system, Phase 1.
 *
 * Fonts load here rather than in the root layout, and `sketch.css` scopes
 * everything to `.sk`, so the running app is untouched: this page is the only
 * thing on the new system until Phase 2 promotes it.
 *
 * The composition is a worked canvas rather than a stack of bands — things
 * pinned to a surface, annotated in the margin, joined by drawn arrows. That
 * shape is why this couldn't have been reached by restyling the old page: the
 * old one is a column of full-bleed sections, and the point here is that the
 * page reads as one surface somebody worked on.
 */

/** Body and UI. Legibility-first, which is the argument for it in a study
 *  tool: the entire risk of a drawn aesthetic is what it does to dense
 *  reading, so the face carrying that reading should be the safest one. */
const ui = Atkinson_Hyperlegible_Next({
  variable: "--ff-ui",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  // next/font has no metrics for this family, so it can't synthesise a
  // size-adjusted fallback and the build says so. Without an explicit stack the
  // swap would reflow noticeably. Verdana is the closest widely-installed face
  // by x-height and width, which is what actually governs the shift — it does
  // not remove it, but it makes it small rather than obvious.
  fallback: ["Verdana", "system-ui", "sans-serif"],
});

/** The hand. BNCE is driven from CSS — 72 at display, 18 at reading size. */
const hand = Shantell_Sans({
  variable: "--ff-hand",
  subsets: ["latin"],
  weight: "variable",
  axes: ["BNCE"],
  display: "swap",
});

/** Labels and figures only. */
const mono = Spline_Sans_Mono({
  variable: "--ff-mono",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export default async function Home() {
  const user = await getSessionUser();
  const signedIn = Boolean(user);

  return (
    <div
      className={cn(
        ui.variable,
        hand.variable,
        mono.variable,
        "sk sk-paper flex min-h-full flex-1 flex-col",
      )}
    >
      <SketchDefs />
      <Header signedIn={signedIn} />

      <main className="flex-1">
        <Hero signedIn={signedIn} />
        <SampleStrip />
        <Loop />
        <Modes />
        <Schedule />
        <Numbers />
        <Faq />
        <Closing signedIn={signedIn} />
      </main>

      <Footer />
    </div>
  );
}

/* ── shared ────────────────────────────────────────────────────────────── */

const SHELL = "mx-auto w-full max-w-6xl px-5";

/**
 * Landing-page button.
 *
 * Local rather than the app's `<Button>`: the drawn edge is a pseudo-element
 * treatment, not a token, so the shared component can't inherit it from the
 * scope the way colours and radii do. Phase 2 rebuilds the real one.
 */
function SkButton({
  children,
  href,
  tone = "primary",
  size = "md",
}: {
  children: ReactNode;
  href: string;
  tone?: "primary" | "plain";
  size?: "md" | "lg";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "sk-edge sk-cast-sm sk-fine inline-flex items-center justify-center gap-2 font-semibold",
        "transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-0.5 active:translate-y-px",
        size === "lg"
          ? "min-h-[3.25rem] px-6 text-[1.0625rem]"
          : "min-h-11 px-4 text-[0.9375rem]",
        tone === "primary" ? "sk-fill-primary text-[var(--primary-fg)]" : "text-text",
      )}
      style={{ ["--sk-radius" as string]: "11px" }}
    >
      {children}
    </Link>
  );
}

/** Section marker. One tracked mono label per section, paired with a drawn
 *  rule — a single device used consistently, not an eyebrow above every
 *  heading pretending to be structure. */
function Rule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="sk-mono shrink-0">{label}</span>
      <span
        aria-hidden="true"
        className="h-px flex-1"
        style={{ background: "var(--ink-soft)" }}
      />
    </div>
  );
}

/* ── header ────────────────────────────────────────────────────────────── */

function Header({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="relative z-20">
      <div className={cn(SHELL, "flex h-20 items-center gap-4")}>
        <Link href="/" className="sk-hand-display text-[1.75rem] text-text">
          Achi
        </Link>

        <nav
          aria-label="Sections"
          className="mx-auto hidden items-center gap-6 md:flex"
        >
          {[
            ["#loop", "how it works"],
            ["#schedule", "scheduling"],
            ["#faq", "questions"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="sk-hand text-lg text-muted transition-colors hover:text-text"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 md:ml-0">
          {signedIn ? (
            <SkButton href="/decks">your decks</SkButton>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="sk-hand hidden min-h-11 items-center px-2 text-lg text-muted transition-colors hover:text-text sm:inline-flex"
              >
                sign in
              </Link>
              <SkButton href="/sign-up">get started</SkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── hero ──────────────────────────────────────────────────────────────── */

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className={cn(SHELL, "pb-20 pt-6 sm:pt-10 lg:pb-28")}>
      {/*
        Asymmetric and overlapping rather than a centred column. The old hero
        centred everything and stacked the card underneath; here the text and
        the card share a row and the annotation crosses between them, which is
        what makes it read as one worked surface instead of two blocks.
      */}
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="relative">
          <h1 className="sk-hand-display text-[3.25rem] text-text sm:text-[4.25rem] lg:text-[4.75rem]">
            You&rsquo;ll forget
            <br />
            this by Thursday.
            <br />
            <span className="relative inline-block text-primary">
              Unless.
              <SketchUnderline className="-bottom-[0.06em] h-[0.2em]" />
            </span>
          </h1>

          <p className="mt-9 max-w-[44ch] text-[1.0625rem] leading-relaxed text-muted sm:text-[1.15rem]">
            Paste your notes and get flashcards back in about twenty seconds.
            Achi then works out which cards are slipping, and puts those in front
            of you — and nothing else.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <SkButton href={signedIn ? "/decks" : "/sign-up"} size="lg">
              {signedIn ? "go to your decks" : "make your first deck"}
            </SkButton>
            <a
              href="#loop"
              className="sk-hand inline-flex min-h-[3.25rem] items-center px-2 text-xl text-text underline decoration-2 underline-offset-[6px] transition-colors hover:text-primary"
              style={{ textDecorationColor: "var(--ink-soft)" }}
            >
              see how it works
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
            {[
              "free — no card, ever",
              "export any time",
              "works on your phone",
            ].map((claim) => (
              <li
                key={claim}
                className="flex items-center gap-2 text-base text-muted"
              >
                <SketchCheck className="size-4 shrink-0 text-primary" />
                {claim}
              </li>
            ))}
          </ul>
        </div>

        {/* The card, pinned. The annotation lives in the gutter on wide screens
            and is dropped below lg, where there is no gutter for it and it
            would just be a stray line of text over the card. */}
        <div className="relative flex justify-center lg:justify-end">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-4 -top-10 hidden w-40 -rotate-[7deg] lg:block xl:-left-14"
          >
            <p className="sk-hand text-lg leading-snug text-subtle">
              this one&rsquo;s real — go on, flip it
            </p>
            <SketchArrow className="ml-10 mt-1 h-9 w-20 text-subtle" />
          </div>

          <SketchCard />
        </div>
      </div>
    </section>
  );
}

/* ── sample strip ──────────────────────────────────────────────────────── */

const SAMPLES: [string, string][] = [
  [
    "Anatomy",
    "Which nerve carries taste from the anterior two-thirds of the tongue?",
  ],
  ["Org. Chem", "SN1 or SN2 — which favours a tertiary substrate?"],
  ["Consti Law", "What must a warrant be supported by?"],
  ["Microecon", "Define price elasticity of demand."],
  ["Pharmacology", "Which beta blockers are cardioselective?"],
  ["Phil. History", "What did the Malolos Constitution establish?"],
];

/**
 * Sample questions drifting past.
 *
 * The track holds two identical copies and translates by exactly -50%, so the
 * loop lands on a frame identical to its start. The duplicate is aria-hidden,
 * so a screen reader gets the list once.
 */
function SampleStrip() {
  return (
    <div
      className="overflow-hidden border-y-2 py-3.5"
      style={{ borderColor: "var(--ink)", background: "var(--surface-sunken)" }}
    >
      <div className="relative [mask-image:linear-gradient(90deg,transparent,black_5rem,black_calc(100%-5rem),transparent)]">
        <ul className="flex w-max animate-[achi-marquee_52s_linear_infinite] items-center motion-reduce:animate-none">
          {[...SAMPLES, ...SAMPLES].map(([subject, question], i) => (
            <li
              key={`${subject}-${i}`}
              className="flex shrink-0 items-center gap-3 pr-10"
              aria-hidden={i >= SAMPLES.length || undefined}
            >
              <span className="sk-mono shrink-0 text-primary">{subject}</span>
              <span className="sk-hand whitespace-nowrap text-lg text-muted">
                {question}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── the loop ──────────────────────────────────────────────────────────── */

const STEPS: [string, string, string][] = [
  [
    "01",
    "you paste",
    "Notes, a PDF, a Word file, a slide deck. Up to 20 MB — or just type it in.",
  ],
  [
    "02",
    "it writes",
    "Questions and answers, kept in your source's exact wording when you ask for that.",
  ],
  [
    "03",
    "you rate",
    "Again, Hard, Good, Easy. That is the entire input it needs from you.",
  ],
  [
    "04",
    "it schedules",
    "Every card comes back on the day you were about to lose it, and not before.",
  ],
];

function Loop() {
  return (
    <section id="loop" className={cn(SHELL, "scroll-mt-8 py-20 lg:py-28")}>
      <Rule label="the loop" />

      <h2 className="sk-hand-display mt-6 max-w-[16ch] text-[2.5rem] text-text sm:text-[3.25rem]">
        How a deck actually happens
      </h2>
      <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted">
        Four steps, and you only do two of them.
      </p>

      {/*
        Connectors only at lg, where the four steps genuinely sit in a row.

        At the 2-column breakpoint the flow goes right, then wraps down — so a
        single arrow direction is wrong for half of them, and the first build
        drew a down-arrow after step 1 that pointed at step 3. Below lg the
        01–04 markers carry the sequence on their own, which is enough.
      */}
      <ol className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([num, title, body], i) => (
          <li key={num} className="relative">
            <div
              className={cn(
                "sk-edge sk-cast h-full p-5",
                i % 3 === 1 && "sk-b",
                i % 3 === 2 && "sk-c",
              )}
            >
              <span className="sk-mono block text-primary">{num}</span>
              <h3 className="sk-hand mt-2.5 text-[1.5rem] leading-tight text-text">
                {title}
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
                {body}
              </p>
            </div>

            {i < STEPS.length - 1 ? (
              <SketchConnector
                aria-hidden="true"
                className="absolute left-full top-1/2 hidden h-5 w-9 -translate-y-1/2 translate-x-[0.375rem] text-[var(--ink-soft)] lg:block"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── modes ─────────────────────────────────────────────────────────────── */

const MODES: [string, string][] = [
  [
    "Flashcards",
    "Front, back, flip. Rate how well you knew it and the card schedules itself.",
  ],
  [
    "Quiz",
    "Multiple choice, true/false and fill-in-the-blank, written from your own cards.",
  ],
  [
    "Tutor",
    "Ask why an answer is what it is. It has your deck as context, so it stays on your material.",
  ],
  [
    "Generate",
    "Paste a chapter or upload a file, and edit the draft deck before anything saves.",
  ],
];

function Modes() {
  return (
    <section
      className="border-y-2 py-20 lg:py-28"
      style={{ borderColor: "var(--ink)", background: "var(--surface-sunken)" }}
    >
      <div className={SHELL}>
        <Rule label="studying" />

        <h2 className="sk-hand-display mt-6 max-w-[18ch] text-[2.5rem] text-text sm:text-[3.25rem]">
          Four ways into the same deck
        </h2>
        <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted">
          Pick by what you need — recognition, recall, or an explanation. They
          all read from the cards you already have.
        </p>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map(([title, body], i) => (
            <li
              key={title}
              className={cn(
                "sk-edge sk-cast p-5",
                i % 3 === 1 && "sk-b",
                i % 3 === 2 && "sk-c",
                // The barely-there grade. A row of four at the full tilt reads
                // as a grid that failed to align, and slants the body text
                // inside with it.
                i % 2 === 0 ? "sk-tilt-a" : "sk-tilt-b",
              )}
            >
              <h3 className="sk-hand text-[1.5rem] leading-tight text-text">
                {title}
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── schedule ──────────────────────────────────────────────────────────── */

const INTERVALS = ["1 day", "3 days", "1 week", "3 weeks", "2 months", "6 months"];

function Schedule() {
  return (
    <section id="schedule" className={cn(SHELL, "scroll-mt-8 py-20 lg:py-28")}>
      <Rule label="scheduling" />

      <div className="mt-6 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div>
          <h2 className="sk-hand-display max-w-[16ch] text-[2.5rem] text-text sm:text-[3.25rem]">
            The gap widens every time you get it right
          </h2>
          <p className="mt-5 max-w-[50ch] text-[1.0625rem] leading-relaxed text-muted">
            Something you nailed comes back in a month. Something you blanked on
            comes back tomorrow. You review what&rsquo;s due and nothing else,
            which is why a deck of six hundred cards still takes ten minutes.
          </p>
          <p className="sk-hand mt-7 max-w-[38ch] text-xl leading-snug text-text">
            one &ldquo;good&rdquo; pushes the next sighting further out. one miss
            drags it back to tomorrow.
          </p>
        </div>

        {/*
          The interval walk as a descending stair — the mechanism in one
          picture rather than another paragraph about spaced repetition.

          One item per row with a growing indent, rather than a wrapping
          horizontal row. The first attempt was horizontal and the last interval
          wrapped onto its own line, landing out of sequence with nothing
          connecting it. A stair that reads top-to-bottom can't wrap wrong, and
          it works at any width — the indent simply flattens on small screens.
        */}
        <ol className="sk-stair space-y-3.5">
          {INTERVALS.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span
                className={cn(
                  "sk-edge sk-cast-sm sk-fine whitespace-nowrap px-3.5 py-2 text-[0.9375rem] font-semibold text-text",
                  i % 3 === 1 && "sk-b",
                  i % 3 === 2 && "sk-c",
                )}
                style={{ ["--sk-radius" as string]: "9px" }}
              >
                {step}
              </span>
              {i === INTERVALS.length - 1 ? (
                <span className="sk-hand text-lg text-subtle">
                  &hellip; and out
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── numbers ───────────────────────────────────────────────────────────── */

const FIGURES: [string, string, string][] = [
  ["40k", "characters", "per generation"],
  ["~20s", "to draft", "a full deck"],
  ["10 yr", "longest interval", "a card can reach"],
];

/**
 * The one drenched band.
 *
 * These are facts about what the software does, not how many people use it. A
 * new product has no user count to quote, and inventing one is exactly where a
 * numbers band goes wrong.
 */
function Numbers() {
  return (
    <section
      className="sk-drench sk-paper border-y-2"
      style={{ borderColor: "var(--ink)" }}
    >
      <div className={cn(SHELL, "py-20 lg:py-24")}>
        <h2 className="sk-hand-display max-w-[18ch] text-[2.5rem] text-text sm:text-[3rem]">
          The whole loop, in three numbers
        </h2>

        <dl className="mt-12 grid gap-7 sm:grid-cols-3">
          {FIGURES.map(([figure, label, sub], i) => (
            <div
              key={figure}
              className={cn(
                "sk-edge sk-cast sk-fill-none p-6",
                i % 3 === 1 && "sk-b",
                i % 3 === 2 && "sk-c",
              )}
            >
              <dt className="sr-only">{`${label} ${sub}`}</dt>
              <dd>
                <span className="sk-hand-display block text-[3rem] leading-none text-text sm:text-[3.5rem]">
                  {figure}
                </span>
                <span className="mt-3 block text-[1.0625rem] text-text">
                  {label}
                </span>
                <span className="mt-0.5 block text-[0.9375rem] text-subtle">
                  {sub}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ── faq ───────────────────────────────────────────────────────────────── */

const FAQS: [string, string][] = [
  [
    "Is it actually free, or free for now?",
    "Free. There is no billing in the app at all — no plans, no card on file, nothing behind a paywall. The AI features have a daily cap because they cost money to run; everything else is unlimited.",
  ],
  [
    "Do I need an account?",
    "To save anything, yes. Your decks live in your account so they're on your phone and your laptop alike. An email and a password is enough.",
  ],
  [
    "What can I upload?",
    "PDF, Word, PowerPoint and plain text for generation, up to 20 MB. For importing a deck you already have: CSV, JSON, or an Anki .apkg. Scanned pages won't work — there's no text layer to read.",
  ],
  [
    "Will the AI make things up?",
    "It can, like any model. That's why you review the draft before it saves, and why you can ask for answers in your source's exact words instead of letting it paraphrase. Check anything you'd be marked down for.",
  ],
  [
    "Can I get my cards back out?",
    "Any deck exports to JSON or CSV from its settings. JSON round-trips back into Achi with topics and hints intact; CSV opens in a spreadsheet.",
  ],
  [
    "What happens to what I paste in?",
    "Text you generate from is sent to Groq to write the cards, and isn't stored by Achi. Your decks and cards live in your account, and nobody else can read them unless you make a deck public or share a link.",
  ],
];

function Faq() {
  return (
    <section id="faq" className={cn(SHELL, "scroll-mt-8 py-20 lg:py-28")}>
      <Rule label="before you sign up" />

      <h2 className="sk-hand-display mt-6 max-w-[16ch] text-[2.5rem] text-text sm:text-[3.25rem]">
        The things people ask first
      </h2>

      {/* <details> so it works with no JavaScript and stays keyboard-operable. */}
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        {FAQS.map(([q, a], i) => (
          <details
            key={q}
            open={i === 0}
            className={cn(
              "sk-edge sk-cast group px-5",
              i % 3 === 1 && "sk-b",
              i % 3 === 2 && "sk-c",
            )}
          >
            <summary className="sk-hand flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[1.25rem] leading-snug text-text [&::-webkit-details-marker]:hidden">
              {q}
              <span
                aria-hidden="true"
                className="shrink-0 text-2xl text-primary transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-[60ch] pb-5 text-[0.9375rem] leading-relaxed text-muted">
              {a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ── closing ───────────────────────────────────────────────────────────── */

function Closing({ signedIn }: { signedIn: boolean }) {
  return (
    <section className={cn(SHELL, "py-20 text-center lg:py-28")}>
      <div className="mx-auto max-w-[34rem]">
        <h2 className="sk-hand-display text-[2.75rem] text-text sm:text-[3.5rem]">
          Bring the notes you
          <br />
          <span className="relative inline-block text-primary">
            already have
            <SketchUnderline className="-bottom-[0.06em] h-[0.2em]" />
          </span>
        </h2>
        <p className="mx-auto mt-7 max-w-[42ch] text-[1.0625rem] leading-relaxed text-muted">
          You&rsquo;ll have cards before you&rsquo;ve finished deciding whether
          this was worth it. Your first deck takes about a minute.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <SkButton href={signedIn ? "/decks" : "/sign-up"} size="lg">
            {signedIn ? "go to your decks" : "make your first deck"}
          </SkButton>
          {signedIn ? null : (
            <SkButton href="/sign-in" tone="plain" size="lg">
              sign in
            </SkButton>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── footer ────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t-2" style={{ borderColor: "var(--ink)" }}>
      <div
        className={cn(
          SHELL,
          "flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-10",
        )}
      >
        <Link href="/" className="sk-hand-display text-2xl text-text">
          Achi
        </Link>

        <nav
          aria-label="Footer"
          className="-my-2 flex flex-wrap gap-x-6 gap-y-1"
        >
          {[
            ["#loop", "how it works"],
            ["#faq", "questions"],
            ["/sign-in", "sign in"],
            ["/sign-up", "get started"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="sk-hand flex min-h-11 items-center text-lg text-muted transition-colors hover:text-text sm:min-h-0"
            >
              {label}
            </Link>
          ))}
        </nav>

        <p className="sk-hand text-lg text-subtle">
          built for people with an exam on Monday
        </p>
      </div>
    </footer>
  );
}
