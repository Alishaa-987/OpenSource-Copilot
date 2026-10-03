"use client";

import { AlertCircle, FileText, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { useDeleteResumeProfile, useResumeProfile, useUploadResume } from "@/lib/backend-hooks";

const ACCEPT = [
  ".pdf", ".docx", ".txt",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
].join(",");

/**
 * Resume upload, in one place so it can be shown anywhere it is useful.
 *
 * It used to be buried inside the issue readiness view, which meant a new
 * contributor had to open an issue before discovering that the product reads
 * a resume at all. It is now also the first card on the profile page.
 */
export function ResumeCard({ compact = false }: { compact?: boolean }) {
  const resume = useResumeProfile();
  const upload = useUploadResume();
  const remove = useDeleteResumeProfile();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = resume.data?.profile ?? null;
  const skillCount = profile ? profile.skills.length + profile.programmingLanguages.length : 0;

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync(file);
    } catch (cause) {
      setError(cause instanceof BackendApiError ? cause.message : "Could not read this resume. Try a different PDF, DOCX, or text file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section className={`rounded-xl border bg-card ${profile ? "border-border" : "border-primary/35 bg-primary/[0.03]"} ${compact ? "p-4" : "p-5"}`}>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(event) => void onFile(event.target.files)} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${profile ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
            <FileText className="size-5" />
          </span>
          <div className="min-w-0">
            {resume.isLoading ? (
              <p className="text-sm text-muted-foreground">Checking for a saved resume…</p>
            ) : profile ? (
              <>
                <p className="truncate text-sm font-semibold text-foreground">{profile.fileName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {skillCount} skill{skillCount === 1 ? "" : "s"} read · updated {new Date(profile.updatedAt).toLocaleDateString()}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">Add your resume</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  PDF, DOCX or text. It is read once and used to check you against an issue before you start.
                </p>
              </>
            )}
          </div>
        </div>

        {!resume.isLoading ? (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant={profile ? "outline" : "default"}
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
            >
              <Upload className="size-4" />
              {upload.isPending ? "Reading…" : profile ? "Replace" : "Upload resume"}
            </Button>
            {profile ? (
              <Button size="sm" variant="ghost" onClick={() => remove.mutate()} disabled={remove.isPending}>Remove</Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm leading-5 text-warning">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </section>
  );
}
