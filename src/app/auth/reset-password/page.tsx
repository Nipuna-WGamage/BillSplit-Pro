import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  return (
    <Suspense
      fallback={
        <main className="auth-screen">
          <p role="status">Verifying password reset link…</p>
        </main>
      }
    >
      <AuthenticatedPasswordUpdate />
    </Suspense>
  );
}

async function AuthenticatedPasswordUpdate() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Could not verify the password reset session. ${error.message}`);
  }

  if (!data.user) {
    redirect("/forgot-password");
  }

  return <PasswordUpdateForm />;
}
