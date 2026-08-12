import { SubmitButton } from "@/components/ui/pending";
import { signOut } from "@/features/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton variant="ghost" size="sm">
        Sign out
      </SubmitButton>
    </form>
  );
}
