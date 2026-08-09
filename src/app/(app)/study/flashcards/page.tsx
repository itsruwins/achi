import type { Metadata } from "next";

import { requireOnboardedUser } from "@/features/auth/queries";
import { FlashcardSession } from "@/features/study/components/flashcard-session";
import { shuffle } from "@/features/study/generate";
import { readList, studyBackHref } from "@/features/study/params";
import { listStudyCards } from "@/features/study/queries";

export const metadata: Metadata = { title: "Flashcards" };

export default async function FlashcardsPage({
  searchParams,
}: PageProps<"/study/flashcards">) {
  const { user } = await requireOnboardedUser();
  const params = await searchParams;

  const deckIds = readList(params.deck);
  const categories = readList(params.category);

  const cards = await listStudyCards(user.id, { deckIds, categories });

  // Shuffled here rather than in the client component: doing it during render
  // there would produce different orders on the server and on hydration.
  const shuffled = shuffle(cards);

  return (
    <FlashcardSession cards={shuffled} backHref={studyBackHref(deckIds)} />
  );
}
