import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { ReviewIcon, StudyIcon } from "@/components/ui/icons";
import { Dot, EmptyState, PageHeader, Section } from "@/components/ui/layout";
import { requireOnboardedUser } from "@/features/auth/queries";
import { TutorPanel } from "@/features/ai/components/tutor-panel";
import { getQuotaRemaining } from "@/features/ai/quota";
import { isGroqConfigured } from "@/lib/groq/client";
import { CardEditor } from "@/features/cards/components/card-editor";
import { CardList } from "@/features/cards/components/card-list";
import { listCards } from "@/features/cards/queries";
import { deriveCategories } from "@/features/cards/types";
import { DeckSettings } from "@/features/decks/components/deck-settings";
import { getDeck } from "@/features/decks/queries";
import { VISIBILITY_LABELS } from "@/features/decks/types";
import { listFolders } from "@/features/folders/queries";
import { EnrollToggle } from "@/features/srs/components/enroll-toggle";
import { isEnrolled } from "@/features/srs/queries";
import { getShareToken } from "@/features/sharing/queries";

export async function generateMetadata({
  params,
}: PageProps<"/decks/[id]">): Promise<Metadata> {
  const { id } = await params;
  const deck = await getDeck(id);
  return { title: deck?.title ?? "Deck" };
}

export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { user } = await requireOnboardedUser();
  const { id } = await params;

  const deck = await getDeck(id);

  // getDeck returns null both for "no such deck" and "RLS hid it". Treating
  // both as 404 is deliberate — a 403 would confirm the deck exists to someone
  // guessing ids.
  if (!deck) notFound();

  const isOwner = deck.user_id === user.id;
  const aiAvailable = isGroqConfigured();

  const [cards, folders, enrolled, quota, shareToken] = await Promise.all([
    listCards(deck.id),
    isOwner ? listFolders(user.id) : Promise.resolve([]),
    isEnrolled(user.id, deck.id),
    aiAvailable ? getQuotaRemaining() : Promise.resolve(null),
    isOwner ? getShareToken(deck.id) : Promise.resolve(null),
  ]);

  const categories = deriveCategories(cards);

  return (
    <div>
      <PageHeader
        backHref="/decks"
        backLabel="Decks"
        title={
          <span className="flex items-center gap-2.5">
            {deck.emoji ? (
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-control bg-sunken text-xl leading-none"
              >
                {deck.emoji}
              </span>
            ) : null}
            <span className="min-w-0">{deck.title}</span>
          </span>
        }
        description={deck.description}
        meta={
          <>
            <span className="tnum">
              {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
            </span>
            <Dot />
            <span>{VISIBILITY_LABELS[deck.visibility]}</span>
            {categories.length > 0 ? (
              <>
                <Dot />
                <span className="tnum">
                  {categories.length}{" "}
                  {categories.length === 1 ? "topic" : "topics"}
                </span>
              </>
            ) : null}
            {enrolled ? (
              <>
                <Dot />
                <Badge tone="primary">In review</Badge>
              </>
            ) : null}
          </>
        }
        actions={
          isOwner ? (
            <DeckSettings
              deck={deck}
              folders={folders}
              shareToken={shareToken}
            />
          ) : null
        }
      />

      {/*
        The study actions are the point of the page, so they sit in their own
        bar directly under the title rather than mixed into the header's action
        cluster with settings and sharing.
      */}
      {cards.length > 0 ? (
        <div className="-mt-1 mb-6 flex flex-wrap items-center gap-2 border-y border-border py-3">
          <Link href={`/study/flashcards?deck=${deck.id}`}>
            <Button>
              <StudyIcon className="size-4" />
              Flashcards
            </Button>
          </Link>
          <Link href={`/study/quiz?deck=${deck.id}&type=multiple_choice`}>
            <Button variant="secondary">Quiz</Button>
          </Link>
          {enrolled ? (
            <Link href={`/review?deck=${deck.id}`}>
              <Button variant="secondary">
                <ReviewIcon className="size-4" />
                Review due
              </Button>
            </Link>
          ) : null}
          <span className="ml-auto">
            <EnrollToggle deckId={deck.id} enrolled={enrolled} />
          </span>
        </div>
      ) : null}

      {aiAvailable && quota && cards.length > 0 ? (
        <TutorPanel deckId={deck.id} remaining={quota.tutor} />
      ) : null}

      {isOwner ? (
        <Section title="Add a card">
          <CardEditor deckId={deck.id} userId={user.id} categories={categories} />
        </Section>
      ) : null}

      <Section
        title="Cards"
        action={
          cards.length > 0 ? (
            <span className="tnum text-sm text-subtle">{cards.length}</span>
          ) : null
        }
      >
        {isOwner ? (
          <CardList deckId={deck.id} userId={user.id} cards={cards} />
        ) : (
          <ReadOnlyCards cards={cards} />
        )}
      </Section>
    </div>
  );
}

/** Someone else's shared deck: visible, not editable. */
function ReadOnlyCards({
  cards,
}: {
  cards: Awaited<ReturnType<typeof listCards>>;
}) {
  if (cards.length === 0) {
    return (
      <EmptyState
        compact
        title="This deck has no cards yet"
        body="The owner hasn't added any. Check back later."
      />
    );
  }

  return (
    <ol className="space-y-1.5">
      {cards.map((card) => (
        <li
          key={card.id}
          className="grid gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-2"
        >
          <p className="whitespace-pre-wrap break-words text-base text-text">
            {card.front}
          </p>
          <p className="whitespace-pre-wrap break-words text-base text-muted">
            {card.back}
          </p>
        </li>
      ))}
    </ol>
  );
}
