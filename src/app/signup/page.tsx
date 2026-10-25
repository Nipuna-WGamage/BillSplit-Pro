import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function SignupPage() {
  return (
    <AuthForm mode="signup" isSupabaseConfigured={isSupabaseConfigured()} />
  );
}
