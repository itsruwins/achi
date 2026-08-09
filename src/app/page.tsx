import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/features/auth/queries";

/**
 * Landing page. Minimal by design — the real marketing page comes later; this
 * exists so there is a front door into the auth flow.
 */
export default async function Home() {
  const user = await getSessionUser();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          Achi
        </h1>

        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted">
          Flashcards, quizzes, and spaced repetition. Build a deck from your
          notes and actually remember it.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {user ? (
            <Link href="/decks">
              <Button>Go to your decks</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-up">
                <Button>Get started</Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="secondary">Sign in</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
