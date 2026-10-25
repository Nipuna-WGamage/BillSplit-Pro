import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <AuthForm mode="login" isSupabaseConfigured={isSupabaseConfigured()} />
  );
}
