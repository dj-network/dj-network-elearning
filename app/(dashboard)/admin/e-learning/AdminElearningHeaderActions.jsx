"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createElearning } from "@/actions/elearning";

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminElearningHeaderActions() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.isPublished = formData.get("isPublished") === "on";

    const result = await createElearning(data);
    setSaving(false);

    if (result?.error) {
      alert(result.error);
      return;
    }

    setIsOpen(false);
    setTitle("");
    setSlug("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-primary text-[#0f1e23] px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
      >
        <span className="material-symbols-outlined">add</span>
        Nouvelle formation
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0f1e23]/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700/60 bg-[#162a31] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
                  LMS
                </p>
                <h2 className="text-2xl font-black text-white">
                  Nouvelle formation
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white"
                aria-label="Fermer"
              >
                <span className="material-symbols-outlined text-3xl">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Titre
                  </label>
                  <input
                    name="title"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      if (!slug) setSlug(slugify(event.target.value));
                    }}
                    required
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Slug URL
                  </label>
                  <input
                    name="slug"
                    value={slug}
                    onChange={(event) => setSlug(slugify(event.target.value))}
                    required
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Formateur
                  </label>
                  <input
                    name="instructor"
                    placeholder="DJ Network"
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Catégorie
                  </label>
                  <input
                    name="category"
                    placeholder="Production musicale"
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  rows="4"
                  className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-primary resize-none"
                />
              </div>

              <label className="flex w-fit items-center gap-3 rounded-2xl border border-slate-800 bg-[#0f1e23] px-4 py-3 text-white">
                <input
                  type="checkbox"
                  name="isPublished"
                  defaultChecked
                  className="checkbox checkbox-primary"
                />
                Publiée en ligne
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-slate-300 hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-5 py-3 font-black text-[#0f1e23] hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
