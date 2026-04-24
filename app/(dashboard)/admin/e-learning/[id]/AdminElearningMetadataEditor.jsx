"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateElearning } from "@/actions/elearning";
import { getPresignedUrl } from "@/actions/r2";
import { resolveMediaUrl } from "@/libs/media";

export default function AdminElearningMetadataEditor({ mc }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function parseTagsText(input) {
    if (!input || typeof input !== "string") return [];
    // Accept JSON array or comma/newline separated.
    const trimmed = input.trim();
    if (trimmed.startsWith("[")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 24);
        }
      } catch {}
    }
    return trimmed
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  function formatTagsForTextarea(json) {
    if (!json) return "";
    try {
      const list = JSON.parse(json);
      if (!Array.isArray(list)) return "";
      return list.map((x) => String(x)).join("\n");
    } catch {
      return "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.price = mc.price ?? null;
    data.accessModel = "assigned";
    data.accessTier = "none";
    data.memberDiscountStudio = null;
    data.memberDiscountStudioPlus = null;
    data.stripeProductId = null;

    const tagsArr = parseTagsText(String(data.tags || ""));
    data.tags = tagsArr.length ? JSON.stringify(tagsArr) : null;

    data.isPublished = fd.get("isPublished") === "on";

    // Handle image upload if a new file was selected
    const imageFile = fd.get("coverImage");
    if (imageFile && imageFile.size > 0) {
      try {
        const {
          signedUrl,
          fileUrl,
          error: r2Error,
        } = await getPresignedUrl(imageFile.name, imageFile.type);
        if (r2Error) throw new Error(r2Error);
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          body: imageFile,
          headers: { "Content-Type": imageFile.type },
        });
        if (!uploadRes.ok) throw new Error("Erreur upload image");
        data.imageUrl = fileUrl;
      } catch (err) {
        alert(err.message);
        setSaving(false);
        return;
      }
    }
    delete data.coverImage;

    const res = await updateElearning(mc.id, data);
    if (res.error) alert(res.error);
    setSaving(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700/50 bg-[#162a31] px-3 text-xs font-bold text-slate-400 transition-all hover:bg-slate-700 hover:text-white md:h-auto md:flex-none md:rounded-lg md:py-1.5"
      >
        <span className="material-symbols-outlined text-sm">settings</span>
        <span className="md:hidden">Infos</span>
        <span className="hidden md:inline">Modifier les infos</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f1e23]/90 backdrop-blur-md p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/50 bg-[#162a31] p-5 shadow-2xl sm:rounded-3xl sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="flex items-center gap-3 text-xl font-bold text-white sm:text-2xl">
                <span className="material-symbols-outlined text-primary">
                  edit_note
                </span>
                Modifier les informations
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Titre de la formation
                  </label>
                  <input
                    name="title"
                    defaultValue={mc.title}
                    required
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Slug (URL)
                  </label>
                  <input
                    name="slug"
                    defaultValue={mc.slug}
                    required
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Instructeur
                  </label>
                  <input
                    name="instructor"
                    defaultValue={mc.instructor}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Catégorie
                  </label>
                  <input
                    name="category"
                    defaultValue={mc.category ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Durée totale
                  </label>
                  <input
                    name="duration"
                    defaultValue={mc.duration ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Niveau
                  </label>
                  <select
                    name="level"
                    defaultValue={mc.level ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  >
                    <option value="">Tous niveaux</option>
                    <option value="Débutant">Débutant</option>
                    <option value="Intermédiaire">Intermédiaire</option>
                    <option value="Avancé">Avancé</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Image de couverture
                  </label>
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    {mc.imageUrl && (
                      <img
                        src={resolveMediaUrl(mc.imageUrl)}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover bg-slate-800 shrink-0"
                      />
                    )}
                    <input
                      name="coverImage"
                      type="file"
                      accept="image/*"
                      className="w-full flex-1 rounded-xl border border-slate-700/50 bg-[#0f1e23] px-4 py-2 text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-[#0f1e23] hover:file:bg-primary/80"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows="4"
                    defaultValue={mc.description ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Tags (filtres)
                  </label>
                  <textarea
                    name="tags"
                    rows="3"
                    defaultValue={formatTagsForTextarea(mc.tags)}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
                    placeholder={"Ex:\nM.A.O\nBusiness\nThéorie"}
                  />
                  <p className="text-slate-600 text-[10px] mt-1">
                    Un tag par ligne (ou séparés par des virgules).
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="inline-flex w-full flex-wrap items-center gap-3 rounded-xl border border-slate-700/50 bg-[#0f1e23] px-4 py-3 text-white sm:w-auto">
                    <input
                      type="checkbox"
                      name="isPublished"
                      defaultChecked={mc.isPublished !== false}
                      className="accent-primary"
                    />
                    <span className="text-sm font-bold">Publié en ligne</span>
                    <span className="text-xs text-slate-400">
                      (si décoché: visible seulement en admin)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl font-bold bg-primary text-[#0f1e23] hover:shadow-[0_0_20px_rgba(6,188,249,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
