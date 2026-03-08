import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { COST_CATEGORIES } from "@/lib/constants";
import { PriceListForm } from "./price-list-form";
import { deletePriceListItem } from "./actions";

export default async function PriceListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; edit?: string }>;
}) {
  const { error, message, edit } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    redirect("/");
  }

  const { data: items } = await supabase
    .from("price_list_items")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("category")
    .order("name");

  const categoryMap = new Map(COST_CATEGORIES.map((c) => [c.value, c.label]));

  // If editing, find the item
  const editItem = edit ? (items ?? []).find((i) => i.id === edit) : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Price List</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Set standard prices for common items. These appear as quick-select options when logging quoted and actual costs.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      {/* Add / Edit form */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          {editItem ? `Edit: ${editItem.name}` : "Add item"}
        </h3>
        <PriceListForm item={editItem ?? null} />
        {editItem && (
          <Link href="/price-list" className="mt-2 inline-block text-xs text-slate-500 hover:text-slate-900">
            Cancel editing
          </Link>
        )}
      </div>

      {/* Items list */}
      {items && items.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Items ({items.length})
          </h3>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Category</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Unit</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700">Unit cost</th>
                  <th className="px-4 py-3 font-medium text-slate-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-600">
                      {categoryMap.get(item.category) ?? item.category}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {formatCurrency(item.unit_cost)}/{item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/price-list?edit=${item.id}`}
                          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <form action={deletePriceListItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button
                            type="submit"
                            className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card layout */}
          <div className="space-y-2 sm:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-sm text-slate-500">
                        {categoryMap.get(item.category) ?? item.category}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {formatCurrency(item.unit_cost)}/{item.unit}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/price-list?edit=${item.id}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <form action={deletePriceListItem}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button
                        type="submit"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          No items yet. Add your first price list item above.
        </p>
      )}
    </div>
  );
}
