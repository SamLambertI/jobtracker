"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function addPriceListItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    redirect("/price-list?error=Unauthorized");
  }

  const category = formData.get("category") as string;
  const name = formData.get("name") as string;
  const unit = formData.get("unit") as string;
  const unitCost = parseFloat(formData.get("unitCost") as string) || 0;

  const { error } = await supabase.from("price_list_items").insert({
    company_id: profile.company_id,
    category,
    name,
    unit,
    unit_cost: unitCost,
  });

  if (error) {
    redirect(`/price-list?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/price-list?message=Item+added");
}

export async function updatePriceListItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const itemId = formData.get("itemId") as string;
  const category = formData.get("category") as string;
  const name = formData.get("name") as string;
  const unit = formData.get("unit") as string;
  const unitCost = parseFloat(formData.get("unitCost") as string) || 0;

  const { error } = await supabase
    .from("price_list_items")
    .update({ category, name, unit, unit_cost: unitCost })
    .eq("id", itemId);

  if (error) {
    redirect(`/price-list?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/price-list?message=Item+updated");
}

export async function deletePriceListItem(formData: FormData) {
  const supabase = await createClient();
  const itemId = formData.get("itemId") as string;

  const { error } = await supabase
    .from("price_list_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    redirect(`/price-list?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/price-list");
}
