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

  const insertPayload = {
    user_id: user?.id ?? null,
    title,
    currency,
    payload,
  };

  const { data, error } = await (supabase as any).from("bills").insert([insertPayload]).select();
  if (error) throw error;

  const row = data?.[0];
  if (!row) {
    throw new Error("Supabase returned no bill row after insert.");
  }
  return row as unknown as BillRow;
}

export async function listBills(): Promise<BillRow[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await (supabase as any)
    .from("bills")
    .select("id,title,currency,total,created_at,payload")
    .eq("user_id", user.id!)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as BillRow[];
}

export async function deleteBill(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("bills")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
