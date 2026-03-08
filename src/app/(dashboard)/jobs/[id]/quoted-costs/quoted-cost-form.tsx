"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { addQuotedCost, updateQuotedCost } from "./actions";
import { COST_CATEGORIES, COMMON_UNITS } from "@/lib/constants";
import Link from "next/link";

const costSchema = z.object({
  category: z.enum(["labour", "materials", "plant_hire", "waste", "other"]),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  unitCost: z.number().min(0, "Must be 0 or more"),
  sortOrder: z.number().int(),
});

type CostFormData = z.infer<typeof costSchema>;

interface PriceListItem {
  id: string;
  category: string;
  name: string;
  unit: string;
  unit_cost: number;
}

interface QuotedCostFormProps {
  jobId: string;
  cost?: {
    id: string;
    category: string;
    description: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    sort_order: number;
  } | null;
  priceListItems: PriceListItem[];
}

export function QuotedCostForm({ jobId, cost, priceListItems }: QuotedCostFormProps) {
  const isEditing = !!cost;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CostFormData>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      category: (cost?.category as CostFormData["category"]) ?? "labour",
      description: cost?.description ?? "",
      quantity: cost?.quantity ?? 1,
      unit: cost?.unit ?? "days",
      unitCost: cost?.unit_cost ?? 0,
      sortOrder: cost?.sort_order ?? 0,
    },
  });

  const quantity = watch("quantity");
  const unitCost = watch("unitCost");
  const lineTotal = (quantity || 0) * (unitCost || 0);

  const handlePriceListSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const itemId = e.target.value;
    if (!itemId) return;
    const item = priceListItems.find((p) => p.id === itemId);
    if (!item) return;
    setValue("category", item.category as CostFormData["category"]);
    setValue("description", item.name);
    setValue("unit", item.unit);
    setValue("unitCost", item.unit_cost);
    e.target.value = ""; // reset dropdown
  };

  const onSubmit = (data: CostFormData) => {
    const formData = new FormData();
    formData.append("jobId", jobId);
    if (cost) formData.append("costId", cost.id);
    formData.append("category", data.category);
    formData.append("description", data.description);
    formData.append("quantity", String(data.quantity));
    formData.append("unit", data.unit);
    formData.append("unitCost", String(data.unitCost));
    formData.append("sortOrder", String(data.sortOrder));
    isEditing ? updateQuotedCost(formData) : addQuotedCost(formData);
  };

  const inputClass =
    "w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Price list quick-select */}
      {priceListItems.length > 0 && !isEditing && (
        <div className="mb-3">
          <label className="mb-1 block text-xs text-slate-500">Quick select from price list</label>
          <select
            onChange={handlePriceListSelect}
            defaultValue=""
            className={inputClass}
          >
            <option value="">— Select an item to auto-fill —</option>
            {COST_CATEGORIES.map((cat) => {
              const items = priceListItems.filter((p) => p.category === cat.value);
              if (items.length === 0) return null;
              return (
                <optgroup key={cat.value} label={cat.label}>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — £{item.unit_cost.toFixed(2)}/{item.unit}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="col-span-2 sm:col-span-2">
          <label className="mb-1 block text-xs text-slate-500">Category</label>
          <select {...register("category")} className={inputClass}>
            {COST_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <label className="mb-1 block text-xs text-slate-500">Description</label>
          <input type="text" {...register("description")} className={inputClass} placeholder="e.g. Marshalls paving slabs 600x600" />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>
        <div className="col-span-1 sm:col-span-1">
          <label className="mb-1 block text-xs text-slate-500">Qty</label>
          <input type="number" step="any" {...register("quantity", { valueAsNumber: true })} className={inputClass} />
          {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
        </div>
        <div className="col-span-1 sm:col-span-1">
          <label className="mb-1 block text-xs text-slate-500">Unit</label>
          <select {...register("unit")} className={inputClass}>
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="col-span-1 sm:col-span-1">
          <label className="mb-1 block text-xs text-slate-500">Unit cost (&pound;)</label>
          <input type="number" step="0.01" {...register("unitCost", { valueAsNumber: true })} className={inputClass} />
          {errors.unitCost && <p className="mt-1 text-xs text-red-600">{errors.unitCost.message}</p>}
        </div>
        <div className="col-span-1 sm:col-span-1">
          <label className="mb-1 block text-xs text-slate-500">Line total</label>
          <div className="flex min-h-[44px] items-center rounded-md bg-slate-50 px-3 text-sm font-medium text-slate-900">
            &pound;{lineTotal.toFixed(2)}
          </div>
        </div>
        <div className="col-span-1 sm:col-span-1">
          <label className="mb-1 block text-xs text-slate-500">Order</label>
          <input type="number" {...register("sortOrder", { valueAsNumber: true })} className={inputClass} />
        </div>
        <div className="col-span-1 flex items-end sm:col-span-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? "..." : isEditing ? "Update" : "Add"}
          </button>
        </div>
      </div>
      {isEditing && (
        <Link
          href={`/jobs/${jobId}/quoted-costs`}
          className="mt-2 inline-block text-xs text-slate-500 hover:text-slate-900"
        >
          Cancel editing
        </Link>
      )}
    </form>
  );
}
