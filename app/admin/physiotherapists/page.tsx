"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhysiotherapistForm } from "@/components/admin/PhysiotherapistForm";

interface Physio {
  id: string;
  full_name: string;
  specialisation: string | null;
  bio: string | null;
  email: string;
  photo_url: string | null;
  is_active: boolean;
}

export default function AdminPhysiotherapistsPage() {
  const [physios, setPhysios] = useState<Physio[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Physio | null>(null);

  function refresh() {
    fetch("/api/admin/physiotherapists")
      .then((res) => res.json())
      .then((data) => setPhysios(data.physiotherapists ?? []))
      .catch(() => setPhysios([]));
  }

  useEffect(refresh, []);

  async function toggleActive(p: Physio) {
    await fetch(`/api/admin/physiotherapists/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    refresh();
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
          Physiotherapists
        </h1>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="flex h-11 items-center justify-center rounded-btn bg-azure px-4 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover"
        >
          Add physiotherapist
        </button>
      </div>

      {physios === null && <p className="mt-8 text-[15px] text-ink-soft">Loading&hellip;</p>}

      {physios !== null && (
        <div className="mt-8 flex flex-col gap-4">
          {physios.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-card border border-line bg-paper p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" className="h-14 w-14 rounded-[16px] object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-[16px] bg-azure-soft" />
                )}
                <div>
                  <p className="text-[18px] font-semibold text-ink">{p.full_name}</p>
                  <p className="text-[15px] text-ink-soft">
                    {p.specialisation ?? "—"} &middot; {p.email}
                  </p>
                  {!p.is_active && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.06em] text-state-danger">
                      Inactive
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 text-[15px] font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(p);
                    setDialogOpen(true);
                  }}
                  className="text-azure-hover hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  className="text-state-danger hover:underline"
                >
                  {p.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit physiotherapist" : "Add physiotherapist"}</DialogTitle>
          </DialogHeader>
          <PhysiotherapistForm
            initial={
              editing
                ? {
                    id: editing.id,
                    full_name: editing.full_name,
                    specialisation: editing.specialisation ?? "",
                    bio: editing.bio ?? "",
                    email: editing.email,
                    photo_url: editing.photo_url ?? "",
                  }
                : undefined
            }
            onSaved={() => {
              setDialogOpen(false);
              refresh();
            }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
