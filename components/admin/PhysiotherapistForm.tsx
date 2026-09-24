"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PhysiotherapistFormValue {
  id?: string;
  full_name: string;
  specialisation: string;
  bio: string;
  email: string;
  photo_url: string;
}

export interface PhysiotherapistFormProps {
  initial?: PhysiotherapistFormValue;
  onSaved: () => void;
  onCancel: () => void;
}

export function PhysiotherapistForm({ initial, onSaved, onCancel }: PhysiotherapistFormProps) {
  const [values, setValues] = useState<PhysiotherapistFormValue>(
    initial ?? { full_name: "", specialisation: "", bio: "", email: "", photo_url: "" }
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("physio-photos")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setError("Could not upload photo.");
        return;
      }

      const { data } = supabase.storage.from("physio-photos").getPublicUrl(path);
      setValues((v) => ({ ...v, photo_url: data.publicUrl }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      full_name: values.full_name,
      specialisation: values.specialisation || undefined,
      bio: values.bio || undefined,
      email: values.email,
      photo_url: values.photo_url || undefined,
    };

    try {
      const res = await fetch(
        initial?.id ? `/api/admin/physiotherapists/${initial.id}` : "/api/admin/physiotherapists",
        {
          method: initial?.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        setSubmitting(false);
        return;
      }

      onSaved();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[15px] font-medium text-ink" htmlFor="full_name">
          Full name
        </label>
        <input
          id="full_name"
          required
          value={values.full_name}
          onChange={(e) => setValues({ ...values, full_name: e.target.value })}
          className="h-11 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[15px] font-medium text-ink" htmlFor="specialisation">
          Specialisation
        </label>
        <input
          id="specialisation"
          value={values.specialisation}
          onChange={(e) => setValues({ ...values, specialisation: e.target.value })}
          className="h-11 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[15px] font-medium text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          className="h-11 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[15px] font-medium text-ink" htmlFor="bio">
          Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          value={values.bio}
          onChange={(e) => setValues({ ...values, bio: e.target.value })}
          className="rounded-btn border border-line-strong bg-paper px-3 py-2 text-[15px] text-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[15px] font-medium text-ink" htmlFor="photo">
          Photo
        </label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="text-[15px] text-ink"
        />
        {uploading && <p className="text-[13px] text-ink-soft">Uploading&hellip;</p>}
        {values.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={values.photo_url} alt="" className="h-16 w-16 rounded-[16px] object-cover" />
        )}
      </div>

      {error && <p className="text-[15px] text-state-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 items-center justify-center rounded-btn border border-line-strong bg-paper px-4 text-[15px] font-medium text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="flex h-11 items-center justify-center rounded-btn bg-azure px-6 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
