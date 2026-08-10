import { Button } from "@/components/ui/button";
import { ReviewIcon } from "@/components/ui/icons";
import { toggleEnrollment } from "@/features/srs/actions";

/**
 * On/off switch for spaced repetition on one deck.
 *
 * The label says what the click will do, not what the current state is —
 * "Stop reviewing" is unambiguous where a toggle reading "Reviewing" leaves you
 * guessing whether it's a status or a button.
 */
export function EnrollToggle({
  deckId,
  enrolled,
}: {
  deckId: string;
  enrolled: boolean;
}) {
  return (
    <form action={toggleEnrollment}>
      <input type="hidden" name="deckId" value={deckId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        title={
          enrolled
            ? "Removes this deck's cards from your review queue. Their schedules are kept."
            : "Schedules each card to come back on the day you're about to forget it."
        }
      >
        {enrolled ? null : <ReviewIcon className="size-3.5" />}
        {enrolled ? "Stop reviewing" : "Add to review"}
      </Button>
    </form>
  );
}
