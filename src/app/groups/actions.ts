"use server";

import { redirect } from "next/navigation";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type InvitationResult =
  | {
      success: true;
      invitation: {
        id: string;
        groupId: string;
        email: string;
        displayName: string;
        expiresAt: string;
      };
    }
  | { success: false; error: string };

export async function inviteGroupMember(input: {
  groupId: string;
  email: string;
  displayName: string;
}): Promise<InvitationResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Group invitations require Supabase configuration." };
  }

  const groupId = input.groupId.trim();
  const email = input.email.trim().toLocaleLowerCase();
  const displayName = input.displayName.trim();

  if (
    !groupId ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !displayName ||
    displayName.length > 80
  ) {
    return {
      success: false,
      error: "Enter a valid email address and a name up to 80 characters.",
    };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      success: false,
      error: userError?.message ?? "Sign in before inviting a group member.",
    };
  }

  const { data: invitationId, error: invitationError } = await supabase.rpc(
    "create_group_invitation",
    {
      p_group_id: groupId,
      p_email: email,
      p_display_name: displayName,
    },
  );

  if (invitationError || !invitationId) {
    return {
      success: false,
      error: invitationError?.message ?? "Could not create the group invitation.",
    };
  }

  const nextPath = `/invites/accept?invitationId=${encodeURIComponent(invitationId)}`;
  const redirectUrl = new URL("/auth/callback", getSiteUrl());
  redirectUrl.searchParams.set("next", nextPath);
  const { error: emailError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: redirectUrl.toString() },
  });

  if (emailError) {
    const { error: cancelError } = await supabase.rpc(
      "cancel_group_invitation",
      { p_invitation_id: invitationId },
    );
    const rollbackMessage = cancelError
      ? ` The pending invitation could not be cancelled: ${cancelError.message}`
      : "";

    return {
      success: false,
      error: `Could not send the sign-in invitation email. ${emailError.message}${rollbackMessage}`,
    };
  }

  return {
    success: true,
    invitation: {
      id: invitationId,
      groupId,
      email,
      displayName,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

export async function cancelGroupInvitation(
  invitationId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Group invitations require Supabase configuration." };
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)) {
    return { success: false, error: "This invitation could not be found." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      success: false,
      error: userError?.message ?? "Sign in before cancelling an invitation.",
    };
  }

  const { error } = await supabase.rpc("cancel_group_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export type AcceptInvitationState = {
  error?: string;
};

export async function acceptGroupInvitation(
  _previousState: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  if (!isSupabaseConfigured()) {
    return { error: "Group invitations require Supabase configuration." };
  }

  const invitationId = formData.get("invitationId");

  if (
    typeof invitationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)
  ) {
    return { error: "This invitation link is invalid." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      error: userError?.message ?? "Sign in with the invited email address first.",
    };
  }

  const { data: groupId, error } = await supabase.rpc(
    "accept_group_invitation",
    { p_invitation_id: invitationId },
  );

  if (error || !groupId) {
    return {
      error: error?.message ?? "Could not accept this group invitation.",
    };
  }

  const safeGroupId = encodeURIComponent(groupId);
  redirect(`/groups/${safeGroupId}`);
}
