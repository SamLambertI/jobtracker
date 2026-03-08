"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { addPriceListItem, updatePriceListItem } from "./actions";
import { COST_CATEGORIES, COMMON_UNITS } from "@/lib/constants";

const itemSchema = z.object({
  category: z.enum(["labour", "materials", "plant_hire", "waste", "other"]),
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
  unitCost: z.number().min(0, "Must be 0 or more"),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface PriceListFormProps {
  item?: {
    id: string;
    category: string;
    name: string;
    unit: string;
    unit_cost: number;
  } | null;
}

export function PriceListForm({ item }: PriceListFormProps) {
  const isEditing = !!item;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      category: (item?.category as ItemFormData["category"]) ?? "materials",
      name: item?.name ?? "",
      unit: item?.unit ?? "each",
      unitCost: item?.unit_cost ?? 0,
    },
  });

  const onSubmit = (data: ItemFormData) => {
    const formData = new FormData();
    if (item) formData.append("itemId", item.id);
    formData.append("category", data.category);
    formData.append("name", data.name);
    formData.append("unit", data.unit);
    formData.append("unitCost", String(data.unitCost));
    if (isEditing) {
      updatePriceListItem(formData);
    } else {
      addPriceListItem(formData);
      reset();
    }
  };

  const inputClass =
    "w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="col-span-1">
          <label className="mb-1 block text-xs text-slate-500">Category</label>
          <select {...register("category")} className={inputClass}>
            {COST_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="mb-1 block text-xs text-slate-500">Name</label>
          <input type="text" {...register("name")} className={inputClass} placeholder="e.g. Type 1 MOT" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="col-span-1">
          <label className="mb-1 block text-xs text-slate-500">Unit</label>
          <select {...register("unit")} className={inputClass}>
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="col-span-1">
          <label className="mb-1 block text-xs text-slate-500">Unit cost</label>
          <div className="flex gap-2">
            <input type="number" step="0.01" {...register("unitCost", { valueAsNumber: true })} className={inputClass} />
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? "..." : isEditing ? "Save" : "Add"}
            </button>
          </div>
          {errors.unitCost && <p className="mt-1 text-xs text-red-600">{errors.unitCost.message}</p>}
        </div>
      </div>
    </form>
  );
}
