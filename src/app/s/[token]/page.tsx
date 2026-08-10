import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/layout";
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
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5">
          <Link href="/">
            <Logo />
          </Link>
          <span className="text-sm text-subtle">Shared deck</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <PageHeader
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
            <span className="tnum">
              {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
            </span>
          }
          actions={
            user ? (
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
            )
          }
        />

        {cards.length === 0 ? (
          <EmptyState
            compact
            title="This deck has no cards yet"
            body="Whoever shared it hasn't added any. The link will keep working when they do."
          />
        ) : (
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
        )}

        {!user ? (
          <p className="mt-8 rounded-card border border-border bg-sunken p-4 text-center text-base text-muted">
            Saving a copy makes it yours to edit, study, and schedule.{" "}
            <Link
              href="/sign-up"
              className="font-medium text-primary underline underline-offset-2"
            >
              Create a free account
            </Link>
            .
          </p>
        ) : null}
      </main>
    </div>
  );
}
