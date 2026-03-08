export const JOB_STATUSES = [
  { value: "quoted", label: "Quoted", color: "bg-slate-100 text-slate-700" },
  { value: "booked", label: "Booked", color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700" },
  { value: "complete", label: "Complete", color: "bg-green-100 text-green-700" },
  { value: "invoiced", label: "Invoiced", color: "bg-purple-100 text-purple-700" },
] as const;

export const COST_CATEGORIES = [
  { value: "labour", label: "Labour" },
  { value: "materials", label: "Materials" },
  { value: "plant_hire", label: "Plant Hire" },
  { value: "waste", label: "Waste" },
  { value: "other", label: "Other" },
] as const;

export const COMMON_UNITS = [
  "days",
  "hours",
  "each",
  "tonnes",
  "loads",
  "m\u00B2",
  "m\u00B3",
  "linear m",
  "bags",
  "sheets",
] as const;

export function formatCurrency(value: number): string {
  return `\u00A3${value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getStatusBadge(status: string) {
  return JOB_STATUSES.find((s) => s.value === status) ?? JOB_STATUSES[0];
}

export const STATUS_FLOW: Record<string, string[]> = {
  quoted: ["booked"],
  booked: ["in_progress", "quoted"],
  in_progress: ["complete", "booked"],
  complete: ["invoiced", "in_progress"],
  invoiced: [],
};
