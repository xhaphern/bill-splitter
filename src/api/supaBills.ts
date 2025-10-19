import { supabase } from "../supabaseClient";
import type { Database, Json } from "../types/database";

type BillRow = Database["public"]["Tables"]["bills"]["Row"];

export interface SaveBillInput {
  title: string | null;
  currency?: string | null;
  payload: Json | null;
}

export async function saveBill({
  title,
  currency = "MVR",
  payload,
}: SaveBillInput): Promise<BillRow> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Must be signed in to save a bill.");

  const insertPayload = {
    user_id: user.id,
    title,
    currency,
    payload,
  };

  const { data, error } = await supabase
    .from("bills")
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw error;
  return data as BillRow;
}

export async function listBills(): Promise<BillRow[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from("bills")
    .select("id,title,currency,total,created_at,payload")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BillRow[];
}

export async function deleteBill(id: string): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Must be signed in to delete a bill.");

  const { error } = await supabase
    .from("bills")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}
