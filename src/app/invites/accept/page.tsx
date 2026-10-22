import { Suspense } from "react";
import { InvitationAcceptance } from "@/components/groups/invitation-acceptance";

async function InvitationPageContent(props: {
  searchParams: Promise<{ invitationId?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const invitationId = Array.isArray(searchParams.invitationId)
    ? searchParams.invitationId[0] ?? ""
    : searchParams.invitationId ?? "";

  return <InvitationAcceptance invitationId={invitationId} />;
}

export default function Page(props: {
  searchParams: Promise<{ invitationId?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="auth-screen">
          <p role="status">Loading invitation…</p>
        </main>
      }
    >
      <InvitationPageContent searchParams={props.searchParams} />
    </Suspense>
  );
}
