import { PageHeader } from "@/components/shell/page-header";
import { TutorialContent } from "@/features/tutorial/components/tutorial-content";
import { GetSession } from "@/lib/session";

// Reads session to tailor tutorials to user role and permissions.
export const instant = false;

export default async function TutorialPage() {
  const session = await GetSession();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tutorial"
        description="Detailed guides for all system features, tailored to your role and permissions."
      />
      <TutorialContent user={session.user} />
    </div>
  );
}
