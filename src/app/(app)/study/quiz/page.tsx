import type { Metadata } from "next";

import { requireOnboardedUser } from "@/features/auth/queries";
import { QuizSession } from "@/features/study/components/quiz-session";
import { generateQuestions } from "@/features/study/generate";
import {
  readCount,
  readList,
  readQuestionTypes,
  studyBackHref,
} from "@/features/study/params";
import { listStudyCards } from "@/features/study/queries";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({ searchParams }: PageProps<"/study/quiz">) {
  const { user } = await requireOnboardedUser();
  const params = await searchParams;

  const deckIds = readList(params.deck);
  const categories = readList(params.category);
  const types = readQuestionTypes(params.type);
  const limit = readCount(params.count);

  const cards = await listStudyCards(user.id, { deckIds, categories });

  // Generated on the server so the question set is fixed for this render —
  // building it in the client would make the server and client markup disagree,
  // and regenerate on every re-render. "New quiz" calls router.refresh(), which
  // re-runs this page and produces a fresh set.
  const questions = generateQuestions(cards, { types, limit });

  return <QuizSession questions={questions} backHref={studyBackHref(deckIds)} />;
}
