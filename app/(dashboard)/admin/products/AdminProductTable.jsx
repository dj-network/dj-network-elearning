"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateProduct,
  deleteProduct,
  updateMasterclass,
  deleteMasterclass,
  reorderProducts,
} from "@/actions/product";
import { getPresignedUrl } from "@/actions/r2";
import { resolveMediaUrl } from "@/libs/media";

export default function AdminProductTable({ items, categories }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState("sortOrder");
  const [sortDir, setSortDir] = useState("asc");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [localItems, setLocalItems] = useState(items);
  const [dragProductId, setDragProductId] = useState(null);
  const [dragOverProductId, setDragOverProductId] = useState(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Use DB categories for the filter dropdown (matches sidebar exactly)
  const allCategoryNames = useMemo(() => {
    return categories.map((c) => c.name).sort();
  }, [categories]);

  // Filter and Sort
  const filteredItems = useMemo(() => {
    let list = [...localItems];

    // Category filter
    if (filterCategory !== "all") {
      list = list.filter((i) => i._categoryName === filterCategory);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.author || i.instructor || "").toLowerCase().includes(q) ||
          (i.slug || "").toLowerCase().includes(q),
      );
    }

    // Sort
    list.sort((a, b) => {
      let aVal = a[sortKey] ?? "";
      let bVal = b[sortKey] ?? "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [localItems, filterCategory, search, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const canReorder =
    sortKey === "sortOrder" && sortDir === "asc" && filterCategory === "all" && !search.trim();

  async function handleDropProduct(targetProductId) {
    if (!dragProductId) return;
    if (!canReorder) return;
    if (dragProductId === targetProductId) return;

    const list = Array.isArray(localItems) ? [...localItems] : [];
    const fromIdx = list.findIndex((p) => p.id === dragProductId);
    const toIdx = list.findIndex((p) => p.id === targetProductId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    const normalized = list.map((item, idx) => ({ ...item, sortOrder: idx }));
    setLocalItems(normalized);

    setSaving(true);
    const res = await reorderProducts(normalized.map((p) => p.id));
    setSaving(false);
    setDragProductId(null);
    setDragOverProductId(null);

    if (res?.error) {
      alert(res.error);
      router.refresh();
      return;
    }

    router.refresh();
  }

  function SortIcon({ col }) {
    if (sortKey !== col)
      return (
        <span className="material-symbols-outlined text-slate-600 text-sm">
          unfold_more
        </span>
      );
    return (
      <span className="material-symbols-outlined text-primary text-sm">
        {sortDir === "asc" ? "arrow_upward" : "arrow_downward"}
      </span>
    );
  }

  function getPreviewUrl(item) {
    if (item._type === "elearning") return `/e-learning/${item.slug}`;
    return `/product/${item.slug}`;
  }

  function parseTagsText(input) {
    if (!input || typeof input !== "string") return [];
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

  function parseSimpleLines(input) {
    if (!input || typeof input !== "string") return [];
    return input
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  function parsePackContentsText(input) {
    if (!input || typeof input !== "string") return [];
    return input
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [labelPart, ...rest] = line.split(":");
        const label = String(labelPart || "").trim();
        const value = rest.join(":").trim();
        return label ? { label, value: value || "-" } : null;
      })
      .filter(Boolean)
      .slice(0, 8);
  }

  async function handleDelete(item) {
    const fn = item._type === "product" ? deleteProduct : deleteMasterclass;
    const res = await fn(item.id);
    if (res.error) alert(res.error);
    setDeleteConfirm(null);
    router.refresh();
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.price = data.price ? parseFloat(data.price) : null;
    data.accessModel = data.accessModel || "purchase_only";
    data.accessTier = data.accessTier || "none";
    data.creditCost = data.creditCost ? parseInt(data.creditCost, 10) : null;
    data.memberDiscountStudio = data.memberDiscountStudio
      ? parseFloat(data.memberDiscountStudio)
      : null;
    data.memberDiscountStudioPlus = data.memberDiscountStudioPlus
      ? parseFloat(data.memberDiscountStudioPlus)
      : null;
    const tagsArr = parseTagsText(String(data.tags || ""));
    data.tags = tagsArr.length ? JSON.stringify(tagsArr) : null;
    const compatibilityArr = parseSimpleLines(String(data.compatibility || ""));
    data.compatibility = compatibilityArr.length
      ? JSON.stringify(compatibilityArr)
      : null;
    const highlightsArr = parseSimpleLines(String(data.highlights || ""));
    data.highlights = highlightsArr.length ? JSON.stringify(highlightsArr) : null;
    const packContentsArr = parsePackContentsText(String(data.packContents || ""));
    data.packContents = packContentsArr.length
      ? JSON.stringify(packContentsArr)
      : null;
    data.isPublished = formData.get("isPublished") === "on";

    // Handle image upload if a new file was selected
    const imageFile = formData.get("coverImage");
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
    // Remove the file from data object
    delete data.coverImage;

    // Handle demo audio upload (MP3) and optional removal
    const removeDemoAudio = formData.get("removeDemoAudio") === "on";
    const demoAudioFile = formData.get("demoAudio");
    if (removeDemoAudio) {
      data.demoAudioUrl = null;
    } else if (demoAudioFile && demoAudioFile.size > 0) {
      try {
        const presign = await getPresignedUrl(
          demoAudioFile.name,
          demoAudioFile.type || "audio/mpeg",
        );
        if (presign.error) throw new Error(presign.error);
        const uploadRes = await fetch(presign.signedUrl, {
          method: "PUT",
          body: demoAudioFile,
          headers: { "Content-Type": demoAudioFile.type || "audio/mpeg" },
        });
        if (!uploadRes.ok) throw new Error("Erreur upload démo audio");
        data.demoAudioUrl = presign.fileUrl;
      } catch (err) {
        alert(err.message);
        setSaving(false);
        return;
      }
    }
    delete data.demoAudio;
    delete data.removeDemoAudio;

    // Handle product file upload (ZIP/PDF) and optional removal
    const removeProductFile = formData.get("removeProductFile") === "on";
    const productFile = formData.get("productFile");
    if (removeProductFile) {
      data.fileUrl = null;
      data.fileSize = null;
    } else if (productFile && productFile.size > 0) {
      try {
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
        if (!uploadRes.ok) throw new Error("Erreur upload fichier");
        data.fileUrl = presign.fileUrl;
        const bytes = Number(productFile.size || 0);
        if (Number.isFinite(bytes) && bytes > 0) {
          const units = ["B", "KB", "MB", "GB", "TB"];
          const i = Math.min(
            units.length - 1,
            Math.floor(Math.log(bytes) / Math.log(1024)),
          );
          const val = bytes / Math.pow(1024, i);
          const rounded =
            val >= 100
              ? Math.round(val)
              : val >= 10
                ? Math.round(val * 10) / 10
                : Math.round(val * 100) / 100;
          data.fileSize = `${rounded} ${units[i]}`;
        } else {
          data.fileSize = null;
        }
      } catch (err) {
        alert(err.message);
        setSaving(false);
        return;
      }
    }
    delete data.productFile;
    delete data.removeProductFile;

    let res;
    if (editItem._type === "product") {
      // For products, map the selected category name back to ID
      const selectedCat = categories.find((c) => c.name === data.categoryName);
      data.categoryId = selectedCat?.id || editItem.categoryId;
      delete data.categoryName;
      res = await updateProduct(editItem.id, data);
    } else {
      // For masterclasses, category is just a text field
      data.category = data.categoryName;
      delete data.categoryName;
      res = await updateMasterclass(editItem.id, data);
    }

    if (res.error) alert(res.error);
    setSaving(false);
    setEditItem(null);
    router.refresh();
  }

  return (
    <>
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-primary transition-colors placeholder:text-slate-500"
            placeholder="Rechercher un produit..."
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary"
        >
          <option value="all">Toutes les catégories</option>
          {allCategoryNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <span className="text-slate-500 text-xs ml-auto">
          {filteredItems.length} produit(s)
        </span>
        <span className="text-slate-500 text-xs">
          {canReorder
            ? "Glisse les lignes pour changer l'ordre"
            : "Réordonner disponible seulement en vue par défaut"}
        </span>
      </div>

      {/* Table */}
      <div className="bg-[#162a31] rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-3 w-12"></th>
                <th className="px-2 py-3 w-12"></th>
                <th
                  className="px-4 py-3 cursor-pointer select-none"
                  onClick={() => handleSort("title")}
                >
                  <span className="flex items-center gap-1 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Titre <SortIcon col="title" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none"
                  onClick={() => handleSort("_categoryName")}
                >
                  <span className="flex items-center gap-1 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Catégorie <SortIcon col="_categoryName" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none"
                  onClick={() => handleSort("price")}
                >
                  <span className="flex items-center gap-1 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Prix <SortIcon col="price" />
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Crédits
                  </span>
                </th>
                <th className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Slug
                  </span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <tr
                  key={item.id}
                  onDragOver={(e) => {
                    if (!dragProductId || !canReorder) return;
                    e.preventDefault();
                    setDragOverProductId(item.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverProductId === item.id) setDragOverProductId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropProduct(item.id);
                  }}
                  className={`border-b border-slate-800/50 hover:bg-[#0f1e23]/50 transition-colors ${
                    dragOverProductId === item.id ? "bg-primary/10" : ""
                  }`}
                >
                  {/* Image */}
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800">
                      <img
                        src={
                          resolveMediaUrl(item.imageUrl) || "/logo.png"
                        }
                        alt=""
                        className="w-full h-full object-cover block"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      draggable={canReorder}
                      onDragStart={(e) => {
                        if (!canReorder) return;
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", item.id);
                        setDragProductId(item.id);
                      }}
                      onDragEnd={() => {
                        setDragProductId(null);
                        setDragOverProductId(null);
                      }}
                      title={
                        canReorder
                          ? "Glisser pour réordonner"
                          : "Active la vue par défaut pour réordonner"
                      }
                      className={`inline-flex ${
                        canReorder
                          ? "text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing"
                          : "text-slate-800 cursor-not-allowed"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        drag_indicator
                      </span>
                    </span>
                  </td>
                  {/* Title + Author */}
                  <td className="px-4 py-3">
                    <p className="text-white font-bold text-sm leading-tight line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-slate-500 text-xs">
                      #{idx + 1} • {item.author || item.instructor || "—"}
                    </p>
                  </td>
                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                      {item._categoryName}
                    </span>
                  </td>
                  {/* Price */}
                  <td className="px-4 py-3">
                    {item.price != null ? (
                      <span className="text-white font-bold text-sm">
                        {item.price.toFixed(2).replace(".", ",")}€
                      </span>
                    ) : (
                      <span className="text-green-400 text-xs font-bold">
                        Gratuit
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-300 text-sm font-medium">
                      {item.creditCost != null ? item.creditCost : "—"}
                    </span>
                  </td>
                  {/* Slug */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-slate-500 text-xs font-mono truncate block max-w-[200px]">
                      /{item.slug}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={getPreviewUrl(item)}
                        target="_blank"
                        className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
                        title="Visualiser"
                      >
                        <span className="material-symbols-outlined text-sm">
                          visibility
                        </span>
                      </Link>
                      <button
                        onClick={() => setEditItem(item)}
                        className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
                        title="Éditer"
                      >
                        <span className="material-symbols-outlined text-sm">
                          edit
                        </span>
                        Éditer
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(item)}
                        className="text-xs font-medium bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-1"
                        title="Supprimer"
                      >
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    Aucun résultat trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e23]/80 backdrop-blur-sm p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
            <span className="material-symbols-outlined text-red-400 text-5xl mb-4">
              warning
            </span>
            <h3 className="text-xl font-bold text-white mb-2">Supprimer ?</h3>
            <p className="text-slate-400 mb-6">
              Êtes-vous sûr de vouloir supprimer{" "}
              <strong className="text-white">{deleteConfirm.title}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e23]/80 backdrop-blur-sm p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-3xl p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  edit_note
                </span>
                Modifier : {editItem.title}
              </h2>
              <div className="flex items-center gap-2">
                <Link
                  href={getPreviewUrl(editItem)}
                  target="_blank"
                  className="text-xs font-medium bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">
                    visibility
                  </span>
                  Prévisualiser
                </Link>
                <button
                  onClick={() => setEditItem(null)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-3xl">
                    close
                  </span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Titre
                  </label>
                  <input
                    name="title"
                    defaultValue={editItem.title}
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
                    defaultValue={editItem.slug}
                    required
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>

	                {/* Image Upload */}
	                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Image de couverture
                  </label>
                  <div className="flex items-center gap-4">
                    {editItem.imageUrl && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                        <img
                          src={resolveMediaUrl(editItem.imageUrl)}
                          alt=""
                          className="w-full h-full object-cover block"
                        />
                      </div>
                    )}
                    <input
                      name="coverImage"
                      type="file"
                      accept="image/*"
                      className="flex-1 bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-[#0f1e23] hover:file:bg-primary/80 outline-none"
                    />
                  </div>
                  <p className="text-slate-600 text-[10px] mt-1">
                    Laissez vide pour conserver l&apos;image actuelle.
                  </p>
                </div>

                {editItem._type === "product" && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Démo audio (MP3)
                    </label>
                    <div className="space-y-2">
                      {editItem.demoAudioUrl && (
                        <div className="flex items-center justify-between gap-3 bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400">Démo actuelle</p>
                            <a
                              href={resolveMediaUrl(editItem.demoAudioUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-primary font-bold truncate block"
                            >
                              Écouter le fichier
                            </a>
                          </div>
                          <label className="inline-flex items-center gap-2 text-xs text-slate-300 shrink-0">
                            <input
                              type="checkbox"
                              name="removeDemoAudio"
                              className="accent-primary"
                            />
                            Supprimer
                          </label>
                        </div>
                      )}
                      <input
                        name="demoAudio"
                        type="file"
                        accept=".mp3,audio/mpeg"
                        className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-[#0f1e23] hover:file:bg-primary/80 outline-none"
                      />
                      <p className="text-slate-600 text-[10px]">
                        Upload d&apos;une démo MP3 optionnelle pour la fiche produit.
                      </p>
                    </div>
                  </div>
                )}

                {editItem._type === "product" && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Fichier du produit (ZIP/PDF)
                      </label>
                      <div className="space-y-2">
                        {editItem.fileUrl && (
                          <div className="flex items-center justify-between gap-3 bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-xs text-slate-400">Fichier actuel</p>
                              <a
                                href={resolveMediaUrl(editItem.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-primary font-bold truncate block"
                              >
                                Ouvrir le fichier
                              </a>
                              {editItem.fileSize && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {editItem.fileSize}
                                </p>
                              )}
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs text-slate-300 shrink-0">
                              <input
                                type="checkbox"
                                name="removeProductFile"
                                className="accent-primary"
                              />
                              Supprimer
                            </label>
                          </div>
                        )}
                        <input
                          name="productFile"
                          type="file"
                          accept=".zip,.pdf,application/zip,application/x-zip-compressed,application/pdf"
                          className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-[#0f1e23] hover:file:bg-primary/80 outline-none"
                        />
                        <p className="text-slate-600 text-[10px]">
                          Laissez vide pour conserver le fichier actuel.
                        </p>
                      </div>
                    </div>
                  )}

                {/* Category selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Catégorie
                  </label>
                  <select
                    name="categoryName"
                    defaultValue={editItem._categoryName}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  >
                    {/* For products, show DB categories */}
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    {/* Also add E-learning / Masterclasses if not already in categories list */}
                    {!categories.find((c) => c.name === "E-learning") && (
                      <option value="E-learning">E-learning</option>
                    )}
                    {!categories.find((c) => c.name === "Masterclasses") && (
                      <option value="Masterclasses">Masterclasses</option>
                    )}
                  </select>
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
                    defaultValue={editItem.price ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                    placeholder="Vide = Gratuit"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {editItem._type === "elearning" ? "Instructeur" : "Auteur"}
                  </label>
                  <input
                    name={
                      editItem._type === "elearning" ? "instructor" : "author"
                    }
                    defaultValue={
                      editItem._type === "elearning"
                        ? editItem.instructor
                        : editItem.author
                    }
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Stripe Product ID
                  </label>
                  <input
                    name="stripeProductId"
                    defaultValue={editItem.stripeProductId ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none focus:border-primary transition-colors"
                    placeholder="prod_..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Modèle d&apos;accès
                  </label>
                  <select
                    name="accessModel"
                    defaultValue={editItem.accessModel ?? "purchase_only"}
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
                    defaultValue={editItem.accessTier ?? "none"}
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
                    Coût en crédits
                  </label>
                  <input
                    name="creditCost"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={editItem.creditCost ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                    placeholder="Ex: 3"
                  />
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
                    defaultValue={editItem.memberDiscountStudio ?? ""}
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
                    defaultValue={editItem.memberDiscountStudioPlus ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    name="tags"
                    defaultValue={(() => {
                      try {
                        const parsed = JSON.parse(editItem.tags || "[]");
                        return Array.isArray(parsed)
                          ? parsed.join(", ")
                          : editItem.tags || "";
                      } catch {
                        return editItem.tags || "";
                      }
                    })()}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                    placeholder="Ex: Techno, House, Drums, Melodic"
                  />
                </div>

                {editItem._type === "product" && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Compatibilité / logiciels
                      </label>
                      <textarea
                        name="compatibility"
                        rows="3"
                        defaultValue={(() => {
                          try {
                            const parsed = JSON.parse(editItem.compatibility || "[]");
                            return Array.isArray(parsed)
                              ? parsed.join("\n")
                              : editItem.compatibility || "";
                          } catch {
                            return editItem.compatibility || "";
                          }
                        })()}
                        className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
                        placeholder={"Ex:\nAll DAWs\nAbleton Live\nFL Studio\nWAV / AIFF"}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Points forts fiche produit
                      </label>
                      <textarea
                        name="highlights"
                        rows="3"
                        defaultValue={(() => {
                          try {
                            const parsed = JSON.parse(editItem.highlights || "[]");
                            return Array.isArray(parsed)
                              ? parsed.join("\n")
                              : editItem.highlights || "";
                          } catch {
                            return editItem.highlights || "";
                          }
                        })()}
                        className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none"
                        placeholder={"Ex:\nRoyalty-free\nPrêt à l'emploi\nEnregistrements haute qualité"}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Contenu du pack
                      </label>
                      <textarea
                        name="packContents"
                        rows="4"
                        defaultValue={(() => {
                          try {
                            const parsed = JSON.parse(editItem.packContents || "[]");
                            return Array.isArray(parsed)
                              ? parsed
                                  .map(
                                    (x) =>
                                      `${String(x?.label || "").trim()}: ${String(x?.value || "-").trim()}`,
                                  )
                                  .join("\n")
                              : editItem.packContents || "";
                          } catch {
                            return editItem.packContents || "";
                          }
                        })()}
                        className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
                        placeholder={"Ex:\nLoops: 120\nOne-Shots: 84\nMIDI Files: 24\nPresets: 16"}
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="inline-flex items-center gap-3 bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-3 text-white">
                    <input
                      type="checkbox"
                      name="isPublished"
                      defaultChecked={editItem.isPublished !== false}
                      className="accent-primary"
                    />
                    <span className="text-sm font-bold">Publié en ligne</span>
                    <span className="text-xs text-slate-400">
                      (si décoché: visible seulement en admin)
                    </span>
                  </label>
                </div>
                {editItem._type === "elearning" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Durée
                      </label>
                      <input
                        name="duration"
                        defaultValue={editItem.duration ?? ""}
                        className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                        placeholder="Ex: 12h 45m"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Niveau
                      </label>
                      <select
                        name="level"
                        defaultValue={editItem.level ?? ""}
                        className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                      >
                        <option value="">Tous niveaux</option>
                        <option value="Débutant">Débutant</option>
                        <option value="Intermédiaire">Intermédiaire</option>
                        <option value="Avancé">Avancé</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows="4"
                    defaultValue={editItem.description ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl font-bold bg-primary text-[#0f1e23] hover:shadow-[0_0_20px_rgba(6,188,249,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0f1e23]/30 border-t-[#0f1e23] rounded-full animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
