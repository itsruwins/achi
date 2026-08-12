import { cn } from "@/lib/utils/cn";

/**
 * Drawn marks and the filters that make edges look drawn.
 *
 * Deliberately a small closed set rather than a general `<Doodle />`. A doodle
 * component that can go anywhere goes everywhere, and the charm of a drawn mark
 * is that it lands where a person would actually have annotated something.
 *
 * Every mark inherits `currentColor` and is `aria-hidden`: these are marks on
 * the page, never content. Anything a mark points at must read without it.
 */

/**
 * The displacement filters, mounted once per page.
 *
 * `baseFrequency` is wobble wavelength, `scale` is amplitude. Three seeds at
 * the same grade so a grid of same-sized tiles doesn't wobble in lockstep —
 * with one seed, identical boxes get identical noise and the result reads as a
 * repeated texture rather than as something drawn by hand.
 *
 * The filter region is widened well past the default -10%/120%: displacement
 * pushes geometry outside the element box, and at the default the wobble gets
 * clipped flat exactly at the corners, where it is most visible.
 */
export function SketchDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        {[
          ["sk-wob-a", 3, 0.019, 4.2],
          ["sk-wob-b", 11, 0.019, 4.2],
          ["sk-wob-c", 23, 0.019, 4.2],
          // Small controls take a finer grade. Amplitude is absolute, so the
          // same wobble that reads as drawn on a card reads as lumpy on a chip.
          ["sk-wob-fine", 7, 0.028, 2.3],
          // Hover. A fourth seed at the same grade, so pointing at any element
          // redraws its edge visibly no matter which seed it started on —
          // swapping a.→b. would be a no-op for anything already using b.
          ["sk-wob-hover", 41, 0.019, 4.6],
        ].map(([id, seed, freq, scale]) => (
          <filter
            key={id}
            id={id as string}
            x="-12%"
            y="-12%"
            width="124%"
            height="124%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={freq as number}
              numOctaves="3"
              seed={seed as number}
              result="n"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="n"
              scale={scale as number}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        ))}
      </defs>
    </svg>
  );
}

/**
 * Wiggle underline for one phrase.
 *
 * Explicit Q segments rather than the `T` shorthand: `T` mirrors the previous
 * control point, so each successive wave damps toward a straight line, which is
 * what a stretched underline least needs. `vector-effect` holds the stroke at a
 * constant width through the horizontal stretch — without it a wide phrase
 * smears the line and it reads as a printing fault.
 */
export function SketchUnderline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 20"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none absolute inset-x-0 w-full", className)}
    >
      {/* pathLength normalises the geometry to 1 unit, so a single
          stroke-dasharray keyframe drives this and the connector alike with no
          per-path measuring. */}
      <path
        d="M 3 13 Q 40 5, 78 11 Q 116 17, 154 10 Q 192 3, 230 11 Q 268 17, 297 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.25"
        strokeLinecap="round"
        pathLength={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Curved arrow for pointing a note at the thing it's about.
 *
 * The head is two strokes off the shaft rather than a filled polygon — a filled
 * triangle reads as an icon, two pen strokes read as one motion without lifting.
 * `flip` mirrors it for annotations sitting on the other side.
 */
export function SketchArrow({
  className,
  flip,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 80 44"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", flip && "-scale-x-100", className)}
    >
      <path
        d="M 5 5 Q 32 33, 72 33 L 65 26 M 72 33 L 65 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Hand-drawn check, for claim lists. Two strokes, uneven on purpose. */
export function SketchCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M 3 11 Q 6 13, 8 16 Q 12 8, 17 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Connector between steps in the flow diagram.
 *
 * Horizontal on wide screens, vertical when the flow stacks — the arrow has to
 * point the way the eye is actually travelling, and a rotated horizontal arrow
 * ends up with its wobble running the wrong way.
 */
export function SketchConnector({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 24"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <path
        d="M 3 13 Q 20 8, 38 12 Q 46 14, 54 12 L 47 7 M 54 12 L 47 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
    </svg>
  );
}

/** Circled emphasis, drawn around a word or a number. */
export function SketchCircle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <path
        d="M 62 4 Q 20 5, 8 26 Q 4 48, 58 56 Q 108 55, 114 32 Q 116 10, 66 4 Q 40 4, 26 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
