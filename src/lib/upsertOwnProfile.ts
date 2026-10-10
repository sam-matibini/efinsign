import { supabase } from "@/integrations/supabase/client";

export async function upsertOwnProfile(userId: string, fullName: string): Promise<{ error: string | null }> {
  const name = fullName.trim();
  if (!userId || !name) return { error: "Enter your full name" };

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (selectError) {
    const rpc = await tryProfileRpc(name);
    if (!rpc.error) return { error: null };
  }

  if (existing?.id) {
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("user_id", userId);
    if (!error) return { error: null };
    const rpc = await tryProfileRpc(name);
    if (!rpc.error) return { error: null };
    return { error: error.message };
  }

  const { error: insertError } = await supabase.from("profiles").insert({ user_id: userId, full_name: name });
  if (!insertError) return { error: null };

  const rpc = await tryProfileRpc(name);
  if (!rpc.error) return { error: null };
  return { error: insertError.message };
}

async function tryProfileRpc(fullName: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("upsert_own_profile" as never, { _full_name: fullName } as never);
  return { error: error?.message || null };
}
