import { cn } from "@/lib/utils/cn";

/**
 * Thin scrolling strip of sample questions.
 *
 * Sits between the hero and the first band as a rule that carries content —
 * it shows what a card actually looks like across subjects without spending a
 * whole section on it.
 *
 * Pure CSS: the track is duplicated once and translated by exactly -50%, so the
 * loop is seamless with no JavaScript and no layout thrash. The copy is
 * `aria-hidden` and the strip is a plain list to a screen reader, which reads
 * each item once.
 */
const SAMPLES: [string, string][] = [
  ["Anatomy", "Which nerve carries taste from the anterior two-thirds of the tongue?"],
  ["Org. Chem", "SN1 or SN2 — which favours a tertiary substrate?"],
  ["Consti Law", "What must a warrant be supported by under Article III?"],
  ["Microecon", "Define price elasticity of demand."],
  ["Pharmacology", "Which beta blockers are cardioselective?"],
  ["Philippine Hist", "What did the Malolos Constitution establish?"],
];

export function Ticker() {
  return (
    <div className="band-dark overflow-hidden border-y border-border">
      <div className="flex items-center">
        <span className="label-data z-10 shrink-0 border-r border-border bg-bg py-2.5 pl-5 pr-4 text-primary">
          Sample cards
        </span>

        {/* The mask fades both ends so items enter and leave rather than
            being sliced off at a hard edge. */}
        <div className="relative min-w-0 flex-1 [mask-image:linear-gradient(90deg,transparent,black_7rem,black_calc(100%-7rem),transparent)]">
          <ul className="flex w-max animate-[achi-marquee_46s_linear_infinite] items-center motion-reduce:animate-none">
            {SAMPLES.map((sample) => (
              <Item key={sample[1]} subject={sample[0]} question={sample[1]} />
            ))}
            {SAMPLES.map((sample) => (
              <Item
                key={`copy-${sample[1]}`}
                subject={sample[0]}
                question={sample[1]}
                aria-hidden
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Item({
  subject,
  question,
  ...props
}: {
  subject: string;
  question: string;
} & React.LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn("flex shrink-0 items-center gap-2.5 py-2.5 pl-5 pr-1")}
      {...props}
    >
      <span className="rounded-pill border border-primary-border bg-primary-subtle px-2 py-0.5 text-2xs font-medium text-primary">
        {subject}
      </span>
      <span className="whitespace-nowrap text-sm text-muted">{question}</span>
      <span aria-hidden="true" className="pl-4 text-border-strong">
        ·
      </span>
    </li>
  );
}
