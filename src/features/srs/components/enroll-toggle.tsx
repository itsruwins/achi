import { Button } from "@/components/ui/button";
import { toggleEnrollment } from "@/features/srs/actions";

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
      <Button type="submit" variant={enrolled ? "ghost" : "secondary"}>
        {enrolled ? "Stop reviewing" : "Add to review"}
      </Button>
    </form>
  );
}
