import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, COST_CATEGORIES } from "@/lib/constants";
import { deleteQuotedCost } from "./actions";
import { QuotedCostForm } from "./quoted-cost-form";

export default async function QuotedCostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; edit?: string }>;
}) {
  const { id: jobId } = await params;
  const { error, edit: editId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    redirect(`/jobs/${jobId}`);
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  // Load price list items
  const { data: priceListItems } = userProfile
    ? await supabase
        .from("price_list_items")
        .select("id, category, name, unit, unit_cost")
        .eq("company_id", userProfile.company_id)
        .order("category")
        .order("name")
    : { data: [] };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, client_name, quoted_total")
    .eq("id", jobId)
    .single();

  if (!job) redirect("/jobs");

  const { data: costs } = await supabase
    .from("quoted_costs")
    .select("*")
    .eq("job_id", jobId)
    .order("sort_order")
    .order("created_at");

  const editingCost = editId
    ? (costs ?? []).find((c) => c.id === editId) ?? null
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2">
        <Link href={`/jobs/${jobId}`} className="text-sm text-slate-400 hover:text-slate-600">&larr; Back to job</Link>
      </div>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">
        Quoted Costs — {job.client_name}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Total: <span className="font-semibold text-slate-900">{formatCurrency(job.quoted_total)}</span>
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Add / edit form */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          {editingCost ? "Edit cost line" : "Add cost line"}
        </h3>
        <QuotedCostForm jobId={jobId} cost={editingCost} priceListItems={priceListItems ?? []} />
      </div>

      {/* Existing lines */}
      {costs && costs.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Category</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Description</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Qty</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Unit</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Unit cost</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {costs.map((c) => (
                  <tr key={c.id} className={editingCost?.id === c.id ? "bg-blue-50" : ""}>
                    <td className="px-4 py-2 text-slate-600">
                      {COST_CATEGORIES.find((cat) => cat.value === c.category)?.label}
                    </td>
                    <td className="px-4 py-2 text-slate-900">{c.description}</td>
                    <td className="px-4 py-2 text-right text-slate-900">{c.quantity}</td>
                    <td className="px-4 py-2 text-slate-600">{c.unit}</td>
                    <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(c.unit_cost)}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">{formatCurrency(c.line_total)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/jobs/${jobId}/quoted-costs?edit=${c.id}`}
                          className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          Edit
                        </Link>
                        <form action={deleteQuotedCost}>
                          <input type="hidden" name="jobId" value={jobId} />
                          <input type="hidden" name="costId" value={c.id} />
                          <button
                            type="submit"
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right font-semibold text-slate-700">Total</td>
                  <td className="px-4 py-2 text-right font-bold text-slate-900">{formatCurrency(job.quoted_total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
