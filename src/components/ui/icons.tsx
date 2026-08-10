/**
 * Icon set.
 *
 * Hand-drawn on one grid rather than pulled from a library: 24px box, 1.75
 * stroke, round caps and joins, no fills. A consistent icon style is one of the
 * few things users notice immediately when it's wrong, and mixing two libraries
 * guarantees mismatched weights.
 */
type IconProps = { className?: string };

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function DecksIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <rect x="3" y="4" width="13" height="16" rx="2" />
      <path d="M19 7v11a2 2 0 0 1-2 2" />
    </svg>
  );
}

export function StudyIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5Z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5Z" />
    </svg>
  );
}

export function ReviewIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4h-4" />
    </svg>
  );
}

export function StatsIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M4 19V5" />
      <path d="M8 19v-6" />
      <path d="M13 19V8" />
      <path d="M18 19v-9" />
    </svg>
  );
}

export function CommunityIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.9" />
      <path d="M17.5 19a5.5 5.5 0 0 0-2-4.2" />
    </svg>
  );
}

export function FlameIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 3s4.5 3.6 4.5 8a4.5 4.5 0 0 1-9 0c0-1.4.5-2.6 1.2-3.6.3 1 .9 1.8 1.6 2.2C10.8 7.4 12 5.2 12 3Z" />
      <path d="M7.5 11A6.5 6.5 0 0 0 12 21a6.5 6.5 0 0 0 4.5-10" />
    </svg>
  );
}

export function PlusIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SearchIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SparkIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9Z" />
      <path d="M18.5 4v3M20 5.5h-3" />
    </svg>
  );
}

export function ImportIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 4v10" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M5 17.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.5" />
    </svg>
  );
}

export function CheckIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function ChevronIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}
