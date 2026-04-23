"use client";

import { useState } from "react";
import { getPresignedUrl } from "@/actions/r2";
import { createProduct } from "@/actions/product";

export default function AdminProductUploadForm({ categories, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const parseLines = (value) =>
    String(value || "")
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);

  const parsePackContents = (value) =>
    String(value || "")
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [labelPart, ...rest] = line.split(":");
        const label = String(labelPart || "").trim();
        const count = rest.join(":").trim();
        return label ? { label, value: count || "-" } : null;
      })
      .filter(Boolean)
      .slice(0, 8);

  const formatBytes = (bytes) => {
    const n = Number(bytes || 0);
    if (!Number.isFinite(n) || n <= 0) return null;
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    const val = n / Math.pow(1024, i);
    const rounded = val >= 100 ? Math.round(val) : val >= 10 ? Math.round(val * 10) / 10 : Math.round(val * 100) / 100;
    return `${rounded} ${units[i]}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const coverFile = formData.get("coverImage");
    const audioFile = formData.get("demoAudio");
    const productFile = formData.get("productFile");
    let imageUrl = "";
    let demoAudioUrl = null;
    let fileUrl = null;
    let fileSize = null;

    if (coverFile && coverFile.size > 0) {
      try {
        setProgress(10);
        const {
          signedUrl,
          fileUrl,
          error: r2Error,
        } = await getPresignedUrl(coverFile.name, coverFile.type);
        if (r2Error) throw new Error(r2Error);

        setProgress(30);
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          body: coverFile,
          headers: { "Content-Type": coverFile.type },
        });

        if (!uploadRes.ok)
          throw new Error("Erreur lors de l'upload de l'image sur R2");

        imageUrl = fileUrl;
        setProgress(50);
      } catch (err) {
        setError(err.message || "Erreur upload image S3");
        setLoading(false);
        return;
      }
    } else {
      imageUrl = "https://via.placeholder.com/800x450?text=Produit+DJ+Network";
    }

    // 2. Upload Demo Audio to R2 if provided
    if (audioFile && audioFile.size > 0) {
      try {
        setProgress(60);
        const {
          signedUrl,
          fileUrl,
          error: r2Error,
        } = await getPresignedUrl(
          audioFile.name,
          audioFile.type || "application/octet-stream",
        );
        if (r2Error) throw new Error(r2Error);

        setProgress(80);
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          body: audioFile,
          headers: { "Content-Type": audioFile.type },
        });

        if (!uploadRes.ok)
          throw new Error("Erreur lors de l'upload de l'audio sur R2");

        demoAudioUrl = fileUrl;
        setProgress(90);
      } catch (err) {
        setError(err.message || "Erreur upload audio S3");
        setLoading(false);
        return;
      }
    }

    // 3. Upload Product File (ZIP/PDF) to R2 if provided
    if (productFile && productFile.size > 0) {
      try {
        setProgress(92);
        const presign = await getPresignedUrl(
          productFile.name,
          productFile.type || "application/octet-stream",
        );
        if (presign.error) throw new Error(presign.error);
        const uploadRes = await fetch(presign.signedUrl, {
          method: "PUT",
          body: productFile,
          headers: { "Content-Type": productFile.type || "application/octet-stream" },
        });
        if (!uploadRes.ok) throw new Error("Erreur lors de l'upload du fichier sur R2");
        fileUrl = presign.fileUrl;
        fileSize = formatBytes(productFile.size);
        setProgress(95);
      } catch (err) {
        setError(err.message || "Erreur upload fichier S3");
        setLoading(false);
        return;
      }
    }

    // 3. Save Product to Turso
    try {
      const tagsArr = parseLines(formData.get("tags"));
      const compatibilityArr = parseLines(formData.get("compatibility"));
      const highlightsArr = parseLines(formData.get("highlights"));
      const packContentsArr = parsePackContents(formData.get("packContents"));

      const data = {
        title: formData.get("title"),
        slug: formData.get("slug"),
        categoryId: formData.get("categoryId"),
        price: formData.get("price") ? parseFloat(formData.get("price")) : null,
        description: formData.get("description"),
        imageUrl,
        demoAudioUrl,
        fileUrl,
        fileSize,
        author: formData.get("author") || "DJ Network Hub",
        stripeProductId: formData.get("stripeProductId") || null,
        accessModel: formData.get("accessModel") || "purchase_only",
        accessTier: formData.get("accessTier") || "none",
        creditCost: formData.get("creditCost")
          ? parseInt(formData.get("creditCost"), 10)
          : null,
        memberDiscountStudio: formData.get("memberDiscountStudio")
          ? parseFloat(formData.get("memberDiscountStudio"))
          : null,
        memberDiscountStudioPlus: formData.get("memberDiscountStudioPlus")
          ? parseFloat(formData.get("memberDiscountStudioPlus"))
          : null,
        compatibility: compatibilityArr.length
          ? JSON.stringify(compatibilityArr)
          : null,
        highlights: highlightsArr.length ? JSON.stringify(highlightsArr) : null,
        packContents: packContentsArr.length
          ? JSON.stringify(packContentsArr)
          : null,
        tags: tagsArr.length ? JSON.stringify(tagsArr) : null,
        isPublished: formData.get("isPublished") === "on",
      };

      const res = await createProduct(data);
      if (res.error) throw new Error(res.error);

      setProgress(100);
      onSuccess?.(); // Close modal and refresh data
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Titre du produit
          </label>
          <input
            name="title"
            required
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
            placeholder="Ex: Ethereal Textures Vol. 2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            URL personnalisée (slug)
          </label>
          <input
            name="slug"
            required
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
            placeholder="Ex: ethereal-textures-vol-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Catégorie
          </label>
          <select
            name="categoryId"
            required
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
          >
            <option value="">-- Sélectionner --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            ID Produit Stripe (Optionnel)
          </label>
          <input
            name="stripeProductId"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors font-mono text-sm"
            placeholder="Ex: prod_R1g2b3..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Prix (€) - Laissez vide si Gratuit
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
            placeholder="Ex: 29.99"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Modèle d&apos;accès
          </label>
          <select
            name="accessModel"
            defaultValue="purchase_only"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
          >
            <option value="purchase_only">Achat uniquement</option>
            <option value="subscription">Inclus abonnement</option>
            <option value="free">Gratuit</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Formule requise
          </label>
          <select
            name="accessTier"
            defaultValue="none"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
          >
            <option value="none">Aucune</option>
            <option value="free">Free</option>
            <option value="studio">Studio</option>
            <option value="studio_plus">Studio+</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Coût en crédits
          </label>
          <input
            name="creditCost"
            type="number"
            min="0"
            step="1"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
            placeholder="Ex: 3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Remise membre Studio (%)
          </label>
          <input
            name="memberDiscountStudio"
            type="number"
            min="0"
            max="100"
            step="1"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
            placeholder="Ex: 15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Remise membre Studio+ (%)
          </label>
          <input
            name="memberDiscountStudioPlus"
            type="number"
            min="0"
            max="100"
            step="1"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
            placeholder="Ex: 20"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Auteur / Créateur
          </label>
          <input
            name="author"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
            placeholder="Ex: Sound Design Studio"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Image de couverture
          </label>
          <input
            name="coverImage"
            type="file"
            accept="image/*"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-[#0f1e23] hover:file:bg-primary/80 outline-none"
          />
        </div>

	        <div className="col-span-1">
	          <label className="block text-sm font-medium text-slate-300 mb-2">
	            Démo Audio (Optionnel)
	          </label>
	          <input
	            name="demoAudio"
	            type="file"
            accept="audio/*"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-[#0f1e23] hover:file:bg-primary/80 outline-none"
	          />
	        </div>

	        <div className="col-span-2">
	          <label className="block text-sm font-medium text-slate-300 mb-2">
	            Fichier du produit (ZIP/PDF) (Upload R2)
	          </label>
	          <input
	            name="productFile"
	            type="file"
	            accept=".zip,.pdf,application/zip,application/x-zip-compressed,application/pdf"
	            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-[#0f1e23] hover:file:bg-primary/80 outline-none"
	          />
	          <p className="text-slate-500 text-xs mt-1">
	            Si tu ne mets rien, le produit n&apos;aura pas de bouton Télécharger.
	          </p>
	        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description
          </label>
          <textarea
            name="description"
            rows="5"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none"
            placeholder="Description détaillée du produit..."
          ></textarea>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Compatibilité / logiciels
          </label>
          <textarea
            name="compatibility"
            rows="3"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
            placeholder={"Ex:\nAll DAWs\nAbleton Live\nFL Studio\nWAV / AIFF"}
          />
          <p className="text-slate-500 text-xs mt-1">
            Un élément par ligne ou séparé par des virgules.
          </p>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Points forts affichés sur la fiche produit
          </label>
          <textarea
            name="highlights"
            rows="3"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none"
            placeholder={"Ex:\nRoyalty-free\nPrêt à l'emploi\nEnregistrements haute qualité"}
          />
          <p className="text-slate-500 text-xs mt-1">
            Un point fort par ligne.
          </p>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Contenu du pack
          </label>
          <textarea
            name="packContents"
            rows="4"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
            placeholder={"Ex:\nLoops: 120\nOne-Shots: 84\nMIDI Files: 24\nPresets: 16"}
          />
          <p className="text-slate-500 text-xs mt-1">
            Un élément par ligne au format `Nom: valeur`.
          </p>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tags (filtres)
          </label>
          <textarea
            name="tags"
            rows="3"
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
            placeholder={"Ex:\nTemplates\nPresets\nRacks d'effets"}
          />
          <p className="text-slate-500 text-xs mt-1">
            Un tag par ligne (ou séparés par des virgules).
          </p>
        </div>

        <div className="col-span-2">
          <label className="inline-flex items-center gap-3 bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 text-white">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked
              className="accent-primary"
            />
            <span className="text-sm font-bold">Publié en ligne</span>
          </label>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-end border-t border-slate-800">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl font-bold bg-primary text-[#0f1e23] hover:shadow-[0_0_20px_rgba(6,188,249,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-[#0f1e23]/30 border-t-[#0f1e23] rounded-full animate-spin"></span>
              Création... {progress > 0 && `${progress}%`}
            </>
          ) : (
            "Créer le produit"
          )}
        </button>
      </div>
    </form>
  );
}
