import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { deletePhoto } from "./actions";
import { PhotoUploadForm } from "./photo-upload-form";

export default async function PhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: jobId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("jobs")
    .select("id, client_name")
    .eq("id", jobId)
    .single();

  if (!job) redirect("/jobs");

  const { data: photos } = await supabase
    .from("photos")
    .select("id, url, storage_path, caption, taken_at, user_id")
    .eq("job_id", jobId)
    .order("taken_at", { ascending: false });

  // Get photographer names
  const userIds = [...new Set((photos ?? []).map((p) => p.user_id))];
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, name").in("id", userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((u) => [u.id, u.name]));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2">
        <Link href={`/jobs/${jobId}`} className="text-sm text-slate-400 hover:text-slate-600">&larr; Back to job</Link>
      </div>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">
        Photos — {job.client_name}
      </h2>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Upload form */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Upload photo</h3>
        <PhotoUploadForm jobId={jobId} />
      </div>

      {/* Photo grid */}
      {photos && photos.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => {
            const date = new Date(photo.taken_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={photo.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <a href={photo.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || "Job photo"}
                    className="aspect-[4/3] w-full object-cover hover:opacity-90"
                  />
                </a>
                <div className="p-3">
                  {photo.caption && (
                    <p className="text-sm text-slate-900">{photo.caption}</p>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {userMap.get(photo.user_id) ?? "Unknown"} &middot; {date}
                    </p>
                    <form action={deletePhoto}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="photoId" value={photo.id} />
                      <input type="hidden" name="storagePath" value={photo.storage_path} />
                      <button
                        type="submit"
                        className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">No photos yet. Upload the first one above.</p>
      )}
    </div>
  );
}
