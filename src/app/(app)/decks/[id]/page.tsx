import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
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

  const [cards, folders, enrolled, quota] = await Promise.all([
    listCards(deck.id),
    isOwner ? listFolders(user.id) : Promise.resolve([]),
    isEnrolled(user.id, deck.id),
    aiAvailable ? getQuotaRemaining() : Promise.resolve(null),
  ]);

  const categories = deriveCategories(cards);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/decks" className="text-sm text-muted hover:text-text">
          ← Back to decks
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
              {deck.emoji ? (
                <span aria-hidden="true">{deck.emoji}</span>
              ) : null}
              {deck.title}
            </h1>

            {deck.description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted">
                {deck.description}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
              <span>
                {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
              </span>
              <span aria-hidden="true">·</span>
              <span>{VISIBILITY_LABELS[deck.visibility]}</span>
              {categories.length > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {categories.length}{" "}
                    {categories.length === 1 ? "topic" : "topics"}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          {isOwner ? <DeckSettings deck={deck} folders={folders} /> : null}
        </div>

        {cards.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/study/flashcards?deck=${deck.id}`}>
              <Button>Flashcards</Button>
            </Link>
            <Link href={`/study/quiz?deck=${deck.id}&type=multiple_choice`}>
              <Button variant="secondary">Quiz</Button>
            </Link>
            {enrolled ? (
              <Link href={`/review?deck=${deck.id}`}>
                <Button variant="secondary">Review due</Button>
              </Link>
            ) : null}
            <EnrollToggle deckId={deck.id} enrolled={enrolled} />
          </div>
        ) : null}
      </div>

      {aiAvailable && quota && cards.length > 0 ? (
        <TutorPanel deckId={deck.id} remaining={quota.tutor} />
      ) : null}

      {isOwner ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-text">Add a card</h2>
          <CardEditor
            deckId={deck.id}
            userId={user.id}
            categories={categories}
          />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-medium text-text">
          Cards
          {cards.length > 0 ? (
            <span className="ml-2 font-normal text-subtle">
              {cards.length}
            </span>
          ) : null}
        </h2>

        {isOwner ? (
          <CardList deckId={deck.id} userId={user.id} cards={cards} />
        ) : (
          <ReadOnlyCards cards={cards} />
        )}
      </section>
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
      <p className="rounded-card border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-muted">
        This deck has no cards yet.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {cards.map((card) => (
        <li
          key={card.id}
          className="grid gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-2"
        >
          <p className="whitespace-pre-wrap break-words text-sm text-text">
            {card.front}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-muted">
            {card.back}
          </p>
        </li>
      ))}
    </ol>
  );
}
