import Link from "next/link";

import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { CommunityIcon, ImportIcon, SparkIcon } from "@/components/ui/icons";
import { getSessionUser } from "@/features/auth/queries";
import { DemoCard } from "@/features/marketing/components/demo-card";

/**
 * Landing page.
 *
 * The hero's right half is the real flashcard component, not a picture of one —
 * the fastest way to explain a study app is to let someone flip a card before
 * they've signed up for anything.
 */
export default async function Home() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/decks">
                <Button size="sm">Your decks</Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-5xl items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-14 lg:py-24">
          <div>
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-text sm:text-4xl">
              Turn your notes into cards you actually remember.
            </h1>

            <p className="mt-4 max-w-[54ch] text-lg leading-relaxed text-muted">
              Paste a chapter or upload a lecture deck and get a set of
              flashcards back in seconds. Achi then schedules each one for the
              day you&rsquo;re about to forget it — so revision costs minutes a
              day instead of a weekend before the exam.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {user ? (
                <Link href="/decks">
                  <Button size="lg">Go to your decks</Button>
                </Link>
              ) : (
                <>
                  <Link href="/sign-up">
                    <Button size="lg">Start free</Button>
                  </Link>
                  <Link href="/sign-in">
                    <Button size="lg" variant="secondary">
                      Sign in
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <p className="mt-4 text-sm text-subtle">
              No card, no trial timer. Everything here is free.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <DemoCard />
          </div>
        </section>

        {/*
          Three capabilities, deliberately not three identical cards: the first
          is wide with a worked example, the other two sit beside it. Equal
          weight for unequal things is what makes a feature grid read as filler.
        */}
        <section className="border-t border-border bg-sunken">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2 className="max-w-[24ch] text-2xl font-semibold tracking-tight text-text">
              Three ways a deck gets made
            </h2>

            {/*
              The first route is the one people actually use, and it's the only
              one that needs showing rather than describing — so it takes two
              thirds of the row and carries a worked example. The other two
              stack beside it. Three equal boxes would have made the AI path
              look like a footnote.
            */}
            <div className="mt-8 grid items-start gap-3 lg:grid-cols-3">
              <Feature
                className="lg:col-span-2 lg:row-span-2"
                icon={<SparkIcon className="size-4" />}
                title="From your own material"
                body="Paste notes or drop a PDF, Word file, or slide deck. Ask for the answers in your source's exact words when you'll be marked on its definitions, or let it rephrase when you just need the idea to land."
              >
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 py-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-text">
                Then it decides when you see them
              </h2>
              <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-muted">
                Every card you rate moves on its own schedule. Something you
                nailed comes back in a month; something you blanked on comes
                back tomorrow. You review what&rsquo;s due and nothing else, so
                a deck of six hundred cards still takes ten minutes.
              </p>
            </div>

            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Point
                term="Four ratings, not a score"
                detail="Again, Hard, Good, Easy. Honest ratings make the schedule work; a percentage doesn't."
              />
              <Point
                term="Four ways to study"
                detail="Flashcards, multiple choice, true/false, and fill-in-the-blank, across one deck or several."
              />
              <Point
                term="Stats you'd actually act on"
                detail="What's coming up, which cards keep failing, and how far your cards have matured."
              />
              <Point
                term="A tutor that read your deck"
                detail="Ask why an answer is what it is, and get a reply scoped to the cards in front of you."
              />
            </dl>
          </div>
        </section>

        {!user ? (
          <section className="border-t border-border">
            <div className="mx-auto w-full max-w-5xl px-5 py-16 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-text">
                Make your first deck in about a minute
              </h2>
              <p className="mx-auto mt-2 max-w-[52ch] text-base text-muted">
                Bring the notes you already have. You&rsquo;ll have cards before
                you&rsquo;ve finished deciding whether this was worth it.
              </p>
              <Link href="/sign-up" className="mt-6 inline-block">
                <Button size="lg">Start free</Button>
              </Link>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-subtle">
          <Logo />
          <p>Built for people with an exam on Monday.</p>
        </div>
      </footer>
    </div>
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
      className={`rounded-card border border-border bg-surface p-5 ${className ?? ""}`}
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

function Point({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="text-base font-medium text-text">{term}</dt>
      <dd className="mt-1 text-base leading-relaxed text-muted">{detail}</dd>
    </div>
  );
}
