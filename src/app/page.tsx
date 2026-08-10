import Link from "next/link";

import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import {
  CheckIcon,
  CommunityIcon,
  ImportIcon,
  ReviewIcon,
  SparkIcon,
  StatsIcon,
} from "@/components/ui/icons";
import { getSessionUser } from "@/features/auth/queries";
import { DemoCard } from "@/features/marketing/components/demo-card";
import { Showcase } from "@/features/marketing/components/showcase";

/**
 * Landing page.
 *
 * Structured as alternating full-bleed value bands rather than one continuous
 * column — the band edges are what give a long marketing page a sense of
 * chapters, and they're the difference between "a page with sections" and a
 * product site.
 *
 * The hero's right half is the real flashcard component and the tour below runs
 * on the real primitives, so neither can drift from the product it advertises.
 */
export default async function Home() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader signedIn={Boolean(user)} />

      <main className="flex-1">
        <Hero signedIn={Boolean(user)} />
        <CapabilityBand />
        <TourSection />
        <ScheduleSection />
        <FaqSection />
        <ClosingBand signedIn={Boolean(user)} />
      </main>

      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-5">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        {/*
          Section anchors, centred. They exist so a visitor can skip to the part
          they care about instead of scrolling the whole page — which is the
          only reason a marketing nav should exist.
        */}
        <nav
          aria-label="Sections"
          className="mx-auto hidden items-center gap-1 md:flex"
        >
          {[
            ["#tour", "How it works"],
            ["#schedule", "Scheduling"],
            ["#faq", "Questions"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-control px-3 py-1.5 text-base text-muted transition-colors duration-[var(--dur-fast)] hover:bg-hover-wash hover:text-text"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {signedIn ? (
            <Link href="/decks">
              <Button size="sm">
                Your decks
                <Arrow />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">
                  Get started
                  <Arrow />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_minmax(0,27rem)] lg:gap-16 lg:py-24">
      <div>
        <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.05] tracking-tight text-text sm:text-5xl">
          Turn your notes into cards you actually remember.
        </h1>

        <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
          Paste a chapter or upload a lecture deck and get flashcards back in
          seconds. Achi then schedules each card for the day you&rsquo;re about
          to forget it — so revision costs minutes a day instead of a weekend
          before the exam.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {signedIn ? (
            <Link href="/decks">
              <Button size="lg">
                Go to your decks
                <Arrow />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-up">
                <Button size="lg">
                  Start free
                  <Arrow />
                </Button>
              </Link>
              <a href="#tour">
                <Button size="lg" variant="secondary">
                  See how it works
                </Button>
              </a>
            </>
          )}
        </div>

        {/*
          Trust markers as chips, not prose. Each one answers a question people
          actually stall on before signing up, and every claim here is true of
          the product as built — there is no billing code in it at all.
        */}
        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
          {[
            "Free — no card, no trial",
            "Your cards export any time",
            "Works on your phone",
          ].map((claim) => (
            <li
              key={claim}
              className="flex items-center gap-1.5 text-sm text-muted"
            >
              <CheckIcon className="size-3.5 shrink-0 text-primary" />
              {claim}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-center lg:justify-end">
        <DemoCard />
      </div>
    </section>
  );
}

/**
 * First inverted band.
 *
 * Deliberately not a 2×2 of identical icon cards — the AI path is the one most
 * people come for, so it gets a worked before/after and twice the width. Equal
 * boxes for unequal things is what turns a feature section into filler.
 */
function CapabilityBand() {
  return (
    <section className="band-dark border-y border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 lg:py-20">
        <div className="max-w-[46ch]">
          <h2 className="text-3xl font-semibold tracking-tight text-text">
            Three ways a deck gets made
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-muted">
            However the material reaches you, it ends up as the same thing: a
            deck you can study and schedule.
          </p>
        </div>

        <div className="mt-10 grid gap-3 lg:grid-cols-[1.55fr_1fr]">
          <Feature
            icon={<SparkIcon className="size-4" />}
            title="From your own material"
            body="Paste notes or drop a PDF, Word file, or slide deck. Ask for answers in your source's exact words when you'll be marked on its definitions, or let it rephrase when you just need the idea to land."
          >
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <ExampleLine
                label="Your notes"
                text="…the chorda tympani branch of CN VII carries taste from the anterior ⅔ of the tongue…"
              />
              <ExampleLine
                label="Card it writes"
                text="Which nerve carries taste from the anterior two-thirds of the tongue?"
                accent
              />
            </div>
          </Feature>

          {/* Stacked in their own column so both stretch to the tall card's
              height instead of leaving a ragged step in the grid. */}
          <div className="grid gap-3">
            <Feature
              icon={<ImportIcon className="size-4" />}
              title="From a file you already have"
              body="CSV, JSON, or an Anki .apkg — imported with its topics intact. Export the same way whenever you want your cards back out."
            />

            <Feature
              icon={<CommunityIcon className="size-4" />}
              title="From someone else"
              body="Make a deck public, share a link, or start a community for your class. Anyone can study it; nobody can edit yours."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function TourSection() {
  return (
    <section id="tour" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 lg:py-20">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight text-text">
            Four ways to study, one deck
          </h2>
          <p className="max-w-[42ch] text-base leading-relaxed text-muted lg:pt-1.5">
            Switch between them based on what you need — recognition, recall, or
            an explanation. They all read from the same cards.
          </p>
        </div>

        <div className="mt-8">
          <Showcase />
        </div>
      </div>
    </section>
  );
}

function ScheduleSection() {
  return (
    <section
      id="schedule"
      className="scroll-mt-16 border-t border-border bg-sunken"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="max-w-[18ch] text-3xl font-semibold tracking-tight text-text">
              Then it decides when you see them
            </h2>
            <p className="mt-4 max-w-[54ch] text-lg leading-relaxed text-muted">
              Every card you rate moves onto its own schedule. Something you
              nailed comes back in a month; something you blanked on comes back
              tomorrow. You review what&rsquo;s due and nothing else, so a deck
              of six hundred cards still takes ten minutes.
            </p>

            {/* A concrete interval walk-through beats another paragraph about
                "spaced repetition" — this is the whole mechanism in one line. */}
            <ol className="mt-6 flex flex-wrap items-center gap-1.5">
              {["1 day", "3 days", "1 week", "3 weeks", "2 months"].map(
                (step, index) => (
                  <li key={step} className="flex items-center gap-1.5">
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-border-strong">
                        →
                      </span>
                    ) : null}
                    <span className="tnum rounded-pill border border-primary-border bg-primary-subtle px-2.5 py-1 text-sm font-medium text-primary">
                      {step}
                    </span>
                  </li>
                ),
              )}
            </ol>
            <p className="mt-2 text-sm text-subtle">
              Each &ldquo;Good&rdquo; rating pushes the next sighting further
              out. A miss resets it.
            </p>
          </div>

          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Point
              icon={<ReviewIcon className="size-4" />}
              term="Four ratings, not a score"
              detail="Again, Hard, Good, Easy. Honest ratings make the schedule work; a percentage doesn't."
            />
            <Point
              icon={<StatsIcon className="size-4" />}
              term="Stats you'd act on"
              detail="What's coming up, which cards keep failing, and how far your cards have matured."
            />
            <Point
              icon={<SparkIcon className="size-4" />}
              term="A tutor that read your deck"
              detail="Ask why an answer is what it is, and get a reply scoped to the cards in front of you."
            />
            <Point
              icon={<ImportIcon className="size-4" />}
              term="Never locked in"
              detail="Export any deck to JSON or CSV whenever you want. Your cards stay yours."
            />
          </dl>
        </div>
      </div>
    </section>
  );
}

/**
 * FAQ instead of testimonials.
 *
 * A new product has no users to quote, and inventing quotes would be a
 * fabricated endorsement. The questions people actually stall on before signing
 * up do the same job honestly.
 *
 * Built on <details> so it works with no JavaScript and stays accessible.
 */
function FaqSection() {
  const faqs: [string, React.ReactNode][] = [
    [
      "Is it actually free, or free for now?",
      "Free. There is no billing in the app at all — no plans, no card on file, no feature behind a paywall. The AI features have a daily cap because they cost money to run; everything else is unlimited.",
    ],
    [
      "Do I need an account?",
      "Yes, to save anything. Your decks live in your account so they're on your phone and laptop alike. Email and a password is enough — no verification hoops beyond confirming the address.",
    ],
    [
      "What can I upload?",
      "PDF, Word, PowerPoint, and plain text for AI generation, up to 20 MB. For importing an existing deck: CSV, JSON, or an Anki .apkg. Scanned pages won't work — there's no text layer to read.",
    ],
    [
      "Will the AI make things up?",
      "It can, like any model. That's why you review the draft before it saves, and why you can ask for the answers in your source's exact words rather than letting it paraphrase. Check anything you'd be marked down for.",
    ],
    [
      "Can I get my cards back out?",
      "Any deck exports to JSON or CSV from its settings. JSON round-trips back into Achi with topics and hints intact; CSV opens in a spreadsheet.",
    ],
    [
      "What happens to what I paste in?",
      "Text you generate from is sent to Groq to write the cards and isn't stored by Achi. Your decks and cards are stored in your account, and nobody else can read them unless you make a deck public or share a link.",
    ],
  ];

  return (
    <section id="faq" className="scroll-mt-16 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 lg:py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-text">
          Before you sign up
        </h2>

        <div className="mt-8 grid gap-x-6 gap-y-2 lg:grid-cols-2">
          {faqs.map(([question, answer], index) => (
            <details
              key={question}
              open={index === 0}
              className="group rounded-card border border-border bg-surface px-4 transition-colors duration-[var(--dur-fast)] hover:border-border-strong"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-md font-medium text-text [&::-webkit-details-marker]:hidden">
                {question}
                <span
                  aria-hidden="true"
                  className="grid size-5 shrink-0 place-items-center rounded-pill text-subtle transition-transform duration-[var(--dur)] ease-[var(--ease-out)] group-open:rotate-45"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-[62ch] pb-4 text-base leading-relaxed text-muted">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingBand({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="band-dark border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 text-center lg:py-24">
        <h2 className="mx-auto max-w-[18ch] text-3xl font-semibold leading-[1.1] tracking-tight text-text sm:text-4xl">
          Make your first deck in about a minute
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-lg leading-relaxed text-muted">
          Bring the notes you already have. You&rsquo;ll have cards before
          you&rsquo;ve finished deciding whether this was worth it.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={signedIn ? "/decks" : "/sign-up"}>
            <Button size="lg">
              {signedIn ? "Go to your decks" : "Start free"}
              <Arrow />
            </Button>
          </Link>
          {signedIn ? null : (
            <Link href="/sign-in">
              <Button size="lg" variant="secondary">
                Sign in
              </Button>
            </Link>
          )}
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {["No card required", "Export any time", "Import from Anki"].map(
            (claim) => (
              <li
                key={claim}
                className="flex items-center gap-1.5 text-sm text-muted"
              >
                <CheckIcon className="size-3.5 shrink-0 text-primary" />
                {claim}
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
        <Link href="/">
          <Logo />
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {[
            ["#tour", "How it works"],
            ["#faq", "Questions"],
            ["/sign-in", "Sign in"],
            ["/sign-up", "Get started"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted transition-colors duration-[var(--dur-fast)] hover:text-text"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-subtle">
          Built for people with an exam on Monday.
        </p>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */

/** Nudges right on hover — the CTA's only flourish. */
function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 transition-transform duration-[var(--dur)] ease-[var(--ease-out)] group-hover/btn:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function Feature({
  icon,
  title,
  body,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`h-full rounded-card border border-border bg-surface p-5 ${className ?? ""}`}
    >
      <span className="grid size-8 place-items-center rounded-control bg-primary-subtle text-primary">
        {icon}
      </span>
      <h3 className="mt-3 text-md font-semibold tracking-tight text-text">
        {title}
      </h3>
      <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed text-muted">
        {body}
      </p>
      {children}
    </div>
  );
}

function ExampleLine({
  label,
  text,
  accent,
}: {
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-control border p-3 ${
        accent
          ? "border-primary-border bg-primary-subtle"
          : "border-border bg-sunken"
      }`}
    >
      <span className="label-data">{label}</span>
      <p
        className={`mt-1.5 text-sm leading-relaxed ${
          accent ? "text-text" : "text-muted"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function Point({
  icon,
  term,
  detail,
}: {
  icon: React.ReactNode;
  term: string;
  detail: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-base font-medium text-text">
        <span className="text-primary">{icon}</span>
        {term}
      </dt>
      <dd className="mt-1 text-base leading-relaxed text-muted">{detail}</dd>
    </div>
  );
}
