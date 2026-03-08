"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { addActualCost, updateActualCost } from "./actions";
import { COST_CATEGORIES, COMMON_UNITS } from "@/lib/constants";
import Link from "next/link";
import { useRef } from "react";

const costSchema = z.object({
  category: z.enum(["labour", "materials", "plant_hire", "waste", "other"]),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  unitCost: z.number().min(0, "Must be 0 or more"),
});

type CostFormData = z.infer<typeof costSchema>;

interface PriceListItem {
  id: string;
  category: string;
  name: string;
  unit: string;
  unit_cost: number;
}

interface ActualCostFormProps {
  jobId: string;
  cost?: {
    id: string;
    category: string;
    description: string;
    quantity: number;
    unit: string;
    unit_cost: number;
  } | null;
  priceListItems: PriceListItem[];
}

export function ActualCostForm({ jobId, cost, priceListItems }: ActualCostFormProps) {
  const isEditing = !!cost;
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (!isEditing && fileInputRef.current?.files?.[0]) {
      formData.append("receipt", fileInputRef.current.files[0]);
    }

    isEditing ? updateActualCost(formData) : addActualCost(formData);
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
          <input type="text" {...register("description")} className={inputClass} placeholder="e.g. 20 bags sharp sand from Jewson" />
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
        {!isEditing && (
          <div className="col-span-2 sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Receipt photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="w-full min-h-[44px] text-sm text-slate-500 file:mr-2 file:min-h-[44px] file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update cost" : "Log cost"}
        </button>
        {isEditing && (
          <Link
            href={`/jobs/${jobId}/actual-costs`}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
