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
    data.price = data.price ? parseFloat(data.price) : null;
    data.accessModel = data.accessModel || "purchase_only";
    data.accessTier = data.accessTier || "none";
    data.memberDiscountStudio = data.memberDiscountStudio
      ? parseFloat(data.memberDiscountStudio)
      : null;
    data.memberDiscountStudioPlus = data.memberDiscountStudioPlus
      ? parseFloat(data.memberDiscountStudioPlus)
      : null;

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
        className="text-xs font-bold bg-[#162a31] text-slate-400 px-3 py-1.5 rounded-lg border border-slate-700/50 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-1.5"
      >
        <span className="material-symbols-outlined text-sm">settings</span>
        Modifier les infos
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f1e23]/90 backdrop-blur-md p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-3xl p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
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
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1">
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
                <div className="col-span-2 sm:col-span-1">
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
                    Prix (€)
                  </label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={mc.price ?? ""}
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
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Stripe Product ID
                  </label>
                  <input
                    name="stripeProductId"
                    defaultValue={mc.stripeProductId ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Modèle d&apos;accès
                  </label>
                  <select
                    name="accessModel"
                    defaultValue={mc.accessModel ?? "purchase_only"}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  >
                    <option value="purchase_only">Achat uniquement</option>
                    <option value="subscription">Inclus abonnement</option>
                    <option value="free">Gratuit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Formule requise
                  </label>
                  <select
                    name="accessTier"
                    defaultValue={mc.accessTier ?? "none"}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  >
                    <option value="none">Aucune</option>
                    <option value="free">Free</option>
                    <option value="studio">Studio</option>
                    <option value="studio_plus">Studio+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Remise Studio (%)
                  </label>
                  <input
                    name="memberDiscountStudio"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    defaultValue={mc.memberDiscountStudio ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Remise Studio+ (%)
                  </label>
                  <input
                    name="memberDiscountStudioPlus"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    defaultValue={mc.memberDiscountStudioPlus ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Image de couverture
                  </label>
                  <div className="flex items-center gap-4">
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
                      className="flex-1 bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-[#0f1e23] hover:file:bg-primary/80 outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-2">
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

                <div className="col-span-2">
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

                <div className="col-span-2">
                  <label className="inline-flex items-center gap-3 bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 text-white">
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

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
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
