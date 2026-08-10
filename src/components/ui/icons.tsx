/**
 * Icon set.
 *
 * Drawn on one grid rather than pulled from a library: 24px box, 1.6 stroke,
 * round caps and joins, no fills. A consistent icon style is one of the few
 * things people notice immediately when it's wrong, and mixing two libraries
 * guarantees mismatched weights.
 *
 * Every glyph is checked at 16px, which is where most of them are actually
 * used. That constraint rules out interior detail: shapes read by silhouette,
 * so a deck is two offset rectangles rather than a rectangle with a spine, and
 * a book is two facing pages rather than a perspective drawing. Stroke dropped
 * from 1.75 to 1.6 for the same reason — at small sizes the heavier weight
 * closed up the counters on the denser glyphs.
 */
type IconProps = { className?: string };

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/* ── Navigation ─────────────────────────────────────────────────────────── */

/** Two offset cards. Reads as a stack at 16px where a single card doesn't. */
export function DecksIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <rect x="3" y="6" width="12" height="14" rx="2.5" />
      <path d="M8 3.2h8.3A3.5 3.5 0 0 1 19.8 6.7V16" />
    </svg>
  );
}

/** A card mid-turn: front face plus the edge of the one behind it. */
export function StudyIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <rect x="3" y="4.5" width="11" height="15" rx="2.5" />
      <path d="M17.5 6.6a3 3 0 0 1 2 2.8v7.1a3 3 0 0 1-2 2.8" />
      <path d="M6.2 12h5.6" />
    </svg>
  );
}

/** Clockwise arrow around a clock face — repetition on a schedule. */
export function ReviewIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.9-6.4" />
      <path d="M20.8 4.2v4.4h-4.4" />
      <path d="M12 8.2V12l2.6 1.6" />
    </svg>
  );
}

/** Bars sitting on a baseline, ascending — not a free-floating cluster. */
export function StatsIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M3.6 20.4h16.8" />
      <path d="M6.8 20.4v-5.2" />
      <path d="M12 20.4V9.4" />
      <path d="M17.2 20.4v-8" />
    </svg>
  );
}

export function CommunityIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <circle cx="9.2" cy="8.4" r="3.1" />
      <path d="M3.4 19.4a5.8 5.8 0 0 1 11.6 0" />
      <path d="M16.2 5.7a3.1 3.1 0 0 1 0 5.9" />
      <path d="M17.4 15.1a5.8 5.8 0 0 1 3.2 4.3" />
    </svg>
  );
}

/* ── Actions ────────────────────────────────────────────────────────────── */

export function PlusIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 5.2v13.6M5.2 12h13.6" />
    </svg>
  );
}

export function SearchIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <circle cx="10.8" cy="10.8" r="6.2" />
      <path d="m19.6 19.6-4.3-4.3" />
    </svg>
  );
}

/** A four-point star. Reserved for AI: generation and the tutor, nothing else. */
export function SparkIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M11.4 3.6 13 8.6l5 1.6-5 1.6-1.6 5-1.6-5-5-1.6 5-1.6z" />
      <path d="M18.4 3.4v3.2M20 5h-3.2" />
    </svg>
  );
}

/** A page with the AI star — generation specifically, as against the tutor. */
export function GenerateIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M13.4 3.4H7a2.2 2.2 0 0 0-2.2 2.2v12.8A2.2 2.2 0 0 0 7 20.6h6.2" />
      <path d="M13.4 3.4 18 8v2.4" />
      <path d="M17.6 13.4l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1z" />
    </svg>
  );
}

/** Arrow into a tray. Paired with ExportIcon, which is the same shape flipped. */
export function ImportIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 3.8v9.8" />
      <path d="m8.2 10 3.8 3.8L15.8 10" />
      <path d="M4.6 16.4v2.2a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8v-2.2" />
    </svg>
  );
}

export function ExportIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 14V4.2" />
      <path d="M8.2 8 12 4.2 15.8 8" />
      <path d="M4.6 16.4v2.2a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8v-2.2" />
    </svg>
  );
}

export function CheckIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="m5 12.6 4.4 4.4L19 7.4" />
    </svg>
  );
}

export function CloseIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6" />
    </svg>
  );
}

export function ChevronIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="m9.4 5.2 6.8 6.8-6.8 6.8" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="m5.2 9.4 6.8 6.8 6.8-6.8" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M4.6 12h14.2" />
      <path d="m13.2 6.4 5.6 5.6-5.6 5.6" />
    </svg>
  );
}

export function ArrowUpIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 19.4V5.2" />
      <path d="m6.4 10.8 5.6-5.6 5.6 5.6" />
    </svg>
  );
}

/* ── Status and objects ─────────────────────────────────────────────────── */

/** Flame with an inner tongue, so the silhouette doesn't read as a leaf. */
export function FlameIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12.4 2.6c.5 2.9 2.2 3.9 3.6 5.6a6.4 6.4 0 1 1-9.9.6c.4 1 1.1 1.7 2 2.1-.4-3.4 1.6-6.4 4.3-8.3Z" />
      <path d="M12 20.8a3.2 3.2 0 0 1-2-5.8c.5 1 1.2 1.4 2 1.6-.2-1.5.5-2.7 1.6-3.5a3.2 3.2 0 0 1-1.6 7.7Z" />
    </svg>
  );
}

export function FolderIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M3.6 7.6a2 2 0 0 1 2-2h3.1a2 2 0 0 1 1.5.7l1 1.2h7.2a2 2 0 0 1 2 2v8.9a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

export function GearIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <circle cx="12" cy="12" r="2.9" />
      <path d="M12 3.2v2.1M12 18.7v2.1M20.8 12h-2.1M5.3 12H3.2M18.2 5.8l-1.5 1.5M7.3 16.7l-1.5 1.5M18.2 18.2l-1.5-1.5M7.3 7.3 5.8 5.8" />
    </svg>
  );
}

export function TrashIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M4.6 6.6h14.8" />
      <path d="M9.2 6.6V5.2a1.6 1.6 0 0 1 1.6-1.6h2.4a1.6 1.6 0 0 1 1.6 1.6v1.4" />
      <path d="M6.6 6.6l.8 12a1.8 1.8 0 0 0 1.8 1.7h5.6a1.8 1.8 0 0 0 1.8-1.7l.8-12" />
    </svg>
  );
}

export function PinIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M9.4 3.6h5.2l-.7 5.1 3 2.9v1.6H7.1v-1.6l3-2.9z" />
      <path d="M12 13.2v7.2" />
    </svg>
  );
}

export function LinkIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M10.2 13.8a3.6 3.6 0 0 0 5.4.4l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.5 1.5" />
      <path d="M13.8 10.2a3.6 3.6 0 0 0-5.4-.4l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.5-1.5" />
    </svg>
  );
}

export function ClockIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3 1.8" />
    </svg>
  );
}
