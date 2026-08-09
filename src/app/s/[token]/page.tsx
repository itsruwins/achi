import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/features/auth/queries";
import { listCards } from "@/features/cards/queries";
import { resolveShareToken } from "@/features/community/queries";
import { getDeck } from "@/features/decks/queries";
import { importSharedDeck } from "@/features/sharing/actions";

export const metadata: Metadata = { title: "Shared deck" };

/**
 * A deck opened by share link.
 *
 * Deliberately outside the (app) route group, so it renders for signed-out
 * visitors — a share link that demands an account before showing anything is
 * not much of a share link. Access is enforced by RLS: the token row only
 * resolves while the deck is non-private, so revoking works without any check
 * here.
 */
export default async function SharedDeckPage({
  params,
}: PageProps<"/s/[token]">) {
  const { token } = await params;

  const deckId = await resolveShareToken(token);
  if (!deckId) notFound();

  const deck = await getDeck(deckId);
  if (!deck) notFound();

  const [cards, user] = await Promise.all([listCards(deck.id), getSessionUser()]);
  const isOwner = user?.id === deck.user_id;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link href="/" className="text-sm text-muted hover:text-text">
        Achi
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
            {deck.emoji ? <span aria-hidden="true">{deck.emoji}</span> : null}
            {deck.title}
          </h1>
          {deck.description ? (
            <p className="mt-1 text-sm text-muted">{deck.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-subtle">
            {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
          </p>
        </div>

        {user ? (
          isOwner ? (
            <Link href={`/decks/${deck.id}`}>
              <Button variant="secondary">Open in your decks</Button>
            </Link>
          ) : (
            <form action={importSharedDeck}>
              <input type="hidden" name="deckId" value={deck.id} />
              <Button type="submit">Save a copy</Button>
            </form>
          )
        ) : (
          <Link href="/sign-up">
            <Button>Sign up to save this</Button>
          </Link>
        )}
      </div>

      <ol className="mt-8 space-y-2">
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

      {cards.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-border-strong bg-surface p-10 text-center text-sm text-muted">
          This deck has no cards yet.
        </p>
      ) : null}
    </main>
  );
}
