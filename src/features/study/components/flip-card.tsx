"use client";

import { cn } from "@/lib/utils/cn";

export type FlipFace = {
  text: string;
  imageUrl?: string | null;
};

/**
 * The flashcard itself — the one interaction the whole product is named after.
 *
 * Both faces are rendered and stacked; the container rotates on Y and
 * `backface-hidden` hides whichever face is turned away. Swapping the text of a
 * single face instead would flip to the answer and then pop, because the new
 * text appears before the rotation finishes.
 *
 * Height is driven by the taller face rather than the visible one, so a short
 * question followed by a long answer doesn't resize the card mid-turn and shove
 * the buttons out from under the cursor. `prefers-reduced-motion` collapses the
 * global transition duration, which turns the turn into an instant swap.
 */
export function FlipCard({
  front,
  back,
  flipped,
  onFlip,
  hint,
  showHint,
  eyebrow,
}: {
  front: FlipFace;
  back: FlipFace;
  flipped: boolean;
  onFlip: () => void;
  hint?: string | null;
  showHint?: boolean;
  eyebrow?: string;
}) {
  return (
    <div className="[perspective:1400px]">
      <button
        type="button"
        onClick={onFlip}
        aria-pressed={flipped}
        aria-label={flipped ? "Show the question" : "Reveal the answer"}
        className={cn(
          "group relative block w-full text-left",
          "transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)]",
          "transform-3d",
          flipped && "rotate-y-180",
        )}
      >
        {/* Sizer: invisible, un-rotated, and holds both faces so the card is as
            tall as the longer one at all times. */}
        <div className="invisible grid" aria-hidden="true">
          <Face className="col-start-1 row-start-1" face={front} />
          <Face className="col-start-1 row-start-1" face={back} />
        </div>

        <Visible
          side="front"
          face={front}
          eyebrow={eyebrow ?? "Question"}
          cue="Tap or press Space to reveal"
        />
        <Visible
          side="back"
          face={back}
          eyebrow="Answer"
          cue="Tap to see the question again"
        />
      </button>

      {/* Below the card, not inside it: a hint that appears mid-card would
          change its height and shift everything underneath. */}
      {hint && showHint && !flipped ? (
        <p className="mt-2 rounded-control border border-warning-subtle bg-warning-subtle px-3 py-2 text-base text-warning [animation:achi-fade-up_var(--dur)_var(--ease-out)]">
          <span className="font-medium">Hint </span>
          {hint}
        </p>
      ) : null}

      {/* The live region is separate from the button so a screen reader
          announces the revealed text without re-reading the whole control. */}
      <p aria-live="polite" className="sr-only">
        {flipped ? back.text : ""}
      </p>
    </div>
  );
}

function Visible({
  side,
  face,
  eyebrow,
  cue,
}: {
  side: "front" | "back";
  face: FlipFace;
  eyebrow: string;
  cue: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col rounded-card border bg-surface p-6 shadow-card backface-hidden sm:p-8",
        "transition-[border-color,box-shadow] duration-[var(--dur)] ease-[var(--ease-out)]",
        "group-hover:border-primary-border group-hover:shadow-raised",
        side === "front" ? "border-border" : "rotate-y-180 border-primary-border",
      )}
    >
      <span
        className={cn(
          "label-data",
          side === "back" && "text-primary",
        )}
      >
        {eyebrow}
      </span>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
        <p className="whitespace-pre-wrap text-lg leading-relaxed text-text">
          {face.text}
        </p>

        {face.imageUrl ? (
          /* Supabase Storage URLs are per-user and not host-allow-listed
             for next/image. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={face.imageUrl}
            alt=""
            className="max-h-52 rounded-control object-contain"
          />
        ) : null}
      </div>

      <span className="text-center text-sm text-subtle">{cue}</span>
    </div>
  );
}

/** Layout-only twin of a face. Same padding and type, so the sizer matches. */
function Face({ face, className }: { face: FlipFace; className?: string }) {
  return (
    <div className={cn("flex min-h-64 flex-col p-6 sm:p-8", className)}>
      <span className="label-data">·</span>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
        <p className="whitespace-pre-wrap text-lg leading-relaxed">{face.text}</p>
        {face.imageUrl ? <div className="h-52 w-full" /> : null}
      </div>
      <span className="text-center text-sm">·</span>
    </div>
  );
}
