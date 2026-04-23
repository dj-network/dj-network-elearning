"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createMasterclass,
  updateMasterclass,
  deleteMasterclass,
  reorderMasterclasses,
} from "@/actions/product";
import { getPresignedUrl } from "@/actions/r2";
import ModalMasterclassCreate from "@/components/ModalMasterclassCreate";
import { resolveMediaUrl } from "@/libs/media";

export default function AdminMasterclassTableClient({ items, courses = [] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState("sortOrder");
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [softwaresDraft, setSoftwaresDraft] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [localItems, setLocalItems] = useState(items);
  const [dragMasterclassId, setDragMasterclassId] = useState(null);
  const [dragOverMasterclassId, setDragOverMasterclassId] = useState(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = [...localItems];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.instructor || "").toLowerCase().includes(q) ||
          (i.category || "").toLowerCase().includes(q),
      );
    }
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
  }, [localItems, search, sortKey, sortDir]);

  const canReorder = sortKey === "sortOrder" && sortDir === "asc" && !search.trim();

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

  function parseChaptersText(text) {
    const raw = String(text || "").trim();
    if (!raw) return [];
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const out = [];
    for (const line of lines) {
      // Accept: "mm:ss Title" or "hh:mm:ss Title"
      const m = line.match(/^(\d{1,2}:)?\d{1,2}:\d{2}\s+(.+)$/);
      if (!m) continue;
      const timePart = line.split(/\s+/)[0];
      const title = line.slice(timePart.length).trim().replace(/^[-–—]\s*/, "");
      const parts = timePart.split(":").map((p) => parseInt(p, 10));
      if (parts.some((n) => Number.isNaN(n))) continue;
      let seconds = 0;
      if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
      if (!title) continue;
      out.push({ title, start: seconds });
    }

    out.sort((a, b) => a.start - b.start);
    const deduped = [];
    const seen = new Set();
    for (const c of out) {
      if (seen.has(c.start)) continue;
      seen.add(c.start);
      deduped.push(c);
    }
    return deduped;
  }

  function formatChaptersForTextarea(chaptersJson) {
    if (!chaptersJson) return "";
    try {
      const list = JSON.parse(chaptersJson);
      if (!Array.isArray(list)) return "";
      const fmt = (s) => {
        const n = Math.max(0, Math.floor(Number(s) || 0));
        const hh = Math.floor(n / 3600);
        const mm = Math.floor((n % 3600) / 60);
        const ss = n % 60;
        if (hh > 0)
          return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
        return `${mm}:${String(ss).padStart(2, "0")}`;
      };
      return list
        .filter((c) => c && typeof c === "object")
        .map((c) => `${fmt(c.start)} ${String(c.title || "").trim()}`.trim())
        .filter(Boolean)
        .join("\n");
    } catch {
      return "";
    }
  }

  function parseJsonArray(value) {
    if (!value || typeof value !== "string") return [];
    try {
      const out = JSON.parse(value);
      return Array.isArray(out) ? out : [];
    } catch {
      return [];
    }
  }

  function makeRowId() {
    try {
      return crypto.randomUUID();
    } catch {
      return `row_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }

  function parseSimpleLines(text) {
    const raw = String(text || "").trim();
    if (!raw) return [];
    return raw
      .split(/\r?\n/g)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 48);
  }

  function parsePairs(text) {
    const raw = String(text || "").trim();
    if (!raw) return [];
    return raw
      .split(/\r?\n/g)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        const title = parts[0] || "";
        const url = parts.slice(1).join("|").trim();
        if (!title || !url) return null;
        return { title, url };
      })
      .filter(Boolean)
      .slice(0, 48);
  }

  function formatPairsForTextarea(json) {
    const arr = parseJsonArray(json);
    return arr
      .map((x) => {
        const title = String(x?.title || "").trim();
        const url = String(x?.url || "").trim();
        if (!title || !url) return "";
        return `${title} | ${url}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  function openEdit(item) {
    setEditItem(item);
    const current = parseJsonArray(item?.softwares);
    setSoftwaresDraft(
      (current || []).map((s) => ({
        _id: makeRowId(),
        name: String(s?.name || ""),
        url: String(s?.url || ""),
        logoUrl: String(s?.logoUrl || ""),
      })),
    );
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
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

  async function handleDelete(item) {
    const res = await deleteMasterclass(item.id);
    if (res.error) alert(res.error);
    setDeleteConfirm(null);
    router.refresh();
  }

  async function handleDropMasterclass(targetMasterclassId) {
    if (!dragMasterclassId || !canReorder) return;
    if (dragMasterclassId === targetMasterclassId) return;

    const list = Array.isArray(localItems) ? [...localItems] : [];
    const fromIdx = list.findIndex((item) => item.id === dragMasterclassId);
    const toIdx = list.findIndex((item) => item.id === targetMasterclassId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    const normalized = list.map((item, idx) => ({ ...item, sortOrder: idx }));
    setLocalItems(normalized);

    setSaving(true);
    const res = await reorderMasterclasses(normalized.map((item) => item.id));
    setSaving(false);
    setDragMasterclassId(null);
    setDragOverMasterclassId(null);

    if (res?.error) {
      alert(res.error);
      router.refresh();
      return;
    }

    router.refresh();
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
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
    data.isPublished = fd.get("isPublished") === "on";
    const chaptersArr = parseChaptersText(fd.get("chapters"));
    data.chapters = chaptersArr.length ? JSON.stringify(chaptersArr) : null;

    const highlightsArr = parseSimpleLines(fd.get("highlights"));
    data.highlights = highlightsArr.length ? JSON.stringify(highlightsArr) : null;

    const downloadsArr = parsePairs(fd.get("downloads"));
    data.downloads = downloadsArr.length ? JSON.stringify(downloadsArr) : null;

    const linksArr = parsePairs(fd.get("links"));
    data.links = linksArr.length ? JSON.stringify(linksArr) : null;

    const softwaresArr = (Array.isArray(softwaresDraft) ? softwaresDraft : [])
      .map((s) => ({
        name: String(s?.name || "").trim(),
        url: String(s?.url || "").trim(),
        logoUrl: String(s?.logoUrl || "").trim(),
      }))
      .filter((s) => s.name || s.url || s.logoUrl)
      .slice(0, 24);
    data.softwares = softwaresArr.length ? JSON.stringify(softwaresArr) : null;

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

    const res = await updateMasterclass(editItem.id, data);
    if (res.error) alert(res.error);
    if (res.warning) alert(res.warning);
    setSaving(false);
    setEditItem(null);
    router.refresh();
  }

  return (
    <>
      {/* Search & Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-primary transition-colors placeholder:text-slate-500"
            placeholder="Rechercher une masterclass..."
          />
        </div>
        <span className="text-slate-500 text-xs ml-auto">
          {filteredItems.length} masterclass(es)
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
                  onClick={() => handleSort("instructor")}
                >
                  <span className="flex items-center gap-1 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Instructeur <SortIcon col="instructor" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hidden md:table-cell"
                  onClick={() => handleSort("category")}
                >
                  <span className="flex items-center gap-1 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Catégorie <SortIcon col="category" />
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
                <th className="px-4 py-3 text-right">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const viewUrl = `/bibliotheque/masterclass/${item.slug}`;

                return (
                  <tr
                    key={item.id}
                    onDragOver={(e) => {
                      if (!dragMasterclassId || !canReorder) return;
                      e.preventDefault();
                      setDragOverMasterclassId(item.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverMasterclassId === item.id) {
                        setDragOverMasterclassId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropMasterclass(item.id);
                    }}
                    className={`border-b border-slate-800/50 hover:bg-[#0f1e23]/50 transition-colors ${
                      dragOverMasterclassId === item.id ? "bg-primary/10" : ""
                    }`}
                  >
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
                          setDragMasterclassId(item.id);
                        }}
                        onDragEnd={() => {
                          setDragMasterclassId(null);
                          setDragOverMasterclassId(null);
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
                    <td className="px-4 py-3">
                      <p className="text-white font-bold text-sm leading-tight line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-slate-500 text-xs">
                        #{idx + 1} • {item.duration || "—"} • {item.level || "Tous niveaux"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm">
                      {item.instructor}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {item.category || "—"}
                      </span>
                    </td>
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={viewUrl}
                          target="_blank"
                          className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
                          title="Visualiser"
                        >
                          <span className="material-symbols-outlined text-sm">
                            visibility
                          </span>
                        </Link>
                        <button
                          onClick={() => openEdit(item)}
                          className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">
                            edit
                          </span>{" "}
                          Éditer
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          className="text-xs font-medium bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    Aucune masterclass trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e23]/80 backdrop-blur-sm p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
            <span className="material-symbols-outlined text-red-400 text-5xl mb-4">
              warning
            </span>
            <h3 className="text-xl font-bold text-white mb-2">Supprimer ?</h3>
            <p className="text-slate-400 mb-6">
              Supprimer{" "}
              <strong className="text-white">{deleteConfirm.title}</strong> ?
              Irréversible.
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
              <button
                onClick={() => {
                  setEditItem(null);
                  setSoftwaresDraft([]);
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">
                  close
                </span>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-5">
              <input type="hidden" name="type" defaultValue={editItem.type} />
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
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Instructeur
                  </label>
                  <input
                    name="instructor"
                    defaultValue={editItem.instructor}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Catégorie
                  </label>
                  <input
                    name="category"
                    defaultValue={editItem.category ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                    placeholder="Ex: Production"
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
                    defaultValue={editItem.price ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                    placeholder="Vide = Gratuit"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Durée
                  </label>
                  <input
                    name="duration"
                    defaultValue={editItem.duration ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
                    placeholder="Ex: 2h 30m"
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
                    placeholder="Ex: 4"
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
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Lien Vidéo YouTube
                  </label>
                  <input
                    name="videoUrl"
                    defaultValue={editItem.videoUrl ?? ""}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none focus:border-primary transition-colors"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
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

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Ce que vous apprendrez
                  </label>
                  <textarea
                    name="highlights"
                    rows="4"
                    defaultValue={parseJsonArray(editItem.highlights).join("\n")}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none"
                    placeholder={"Ex:\nAnalyse du morceau\nSampling (chopping)\nArrangement\nMixage & mastering"}
                  />
                  <p className="text-slate-600 text-[10px] mt-1">
                    Un point par ligne.
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Téléchargements
                  </label>
                  <textarea
                    name="downloads"
                    rows="3"
                    defaultValue={formatPairsForTextarea(editItem.downloads)}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-xs"
                    placeholder={"Projet Ableton Live (gratuit) | https://dj-network.com/..."}
                  />
                  <p className="text-slate-600 text-[10px] mt-1">
                    1 lien par ligne au format `Titre | URL`.
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Logiciels utilisés
                  </label>

                  <div className="space-y-3">
                    {softwaresDraft.length === 0 && (
                      <p className="text-slate-600 text-sm">
                        Aucun logiciel ajouté.
                      </p>
                    )}
                    {softwaresDraft.map((sw, idx) => (
                      <div
                        key={sw._id}
                        className="bg-[#0f1e23] border border-slate-700/50 rounded-2xl p-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700/60 overflow-hidden flex items-center justify-center shrink-0">
                            {sw.logoUrl ? (
                              <img
                                src={resolveMediaUrl(sw.logoUrl)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-slate-600 text-2xl">
                                memory
                              </span>
                            )}
                          </div>

                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                                Nom
                              </label>
                              <input
                                value={sw.name}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setSoftwaresDraft((prev) =>
                                    prev.map((x) =>
                                      x._id === sw._id ? { ...x, name: v } : x,
                                    ),
                                  );
                                }}
                                className="w-full bg-[#162a31] border border-slate-700/50 rounded-xl px-3 py-2 text-white outline-none focus:border-primary transition-colors text-sm"
                                placeholder="Ex: Ableton Live Suite 12"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                                Lien
                              </label>
                              <input
                                value={sw.url}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setSoftwaresDraft((prev) =>
                                    prev.map((x) =>
                                      x._id === sw._id ? { ...x, url: v } : x,
                                    ),
                                  );
                                }}
                                className="w-full bg-[#162a31] border border-slate-700/50 rounded-xl px-3 py-2 text-white outline-none focus:border-primary transition-colors text-sm font-mono"
                                placeholder="https://..."
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                                Logo (upload R2)
                              </label>
                              <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="flex-1 min-w-0 bg-[#162a31] border border-slate-700/50 rounded-xl px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-[#0f1e23] hover:file:bg-primary/80 outline-none"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const { signedUrl, fileUrl, error } =
                                        await getPresignedUrl(file.name, file.type);
                                      if (error) throw new Error(error);
                                      const uploadRes = await fetch(signedUrl, {
                                        method: "PUT",
                                        body: file,
                                        headers: { "Content-Type": file.type },
                                      });
                                      if (!uploadRes.ok)
                                        throw new Error("Upload logo impossible.");
                                      setSoftwaresDraft((prev) =>
                                        prev.map((x) =>
                                          x._id === sw._id
                                            ? { ...x, logoUrl: fileUrl }
                                            : x,
                                        ),
                                      );
                                    } catch (err) {
                                      alert(err?.message || "Erreur upload logo.");
                                    } finally {
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold"
                                  onClick={() => {
                                    setSoftwaresDraft((prev) =>
                                      prev.map((x) =>
                                        x._id === sw._id ? { ...x, logoUrl: "" } : x,
                                      ),
                                    );
                                  }}
                                >
                                  Retirer
                                </button>
                                <button
                                  type="button"
                                  className="px-3 py-2 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition-colors text-xs font-bold"
                                  onClick={() => {
                                    setSoftwaresDraft((prev) =>
                                      prev.filter((x) => x._id !== sw._id),
                                    );
                                  }}
                                >
                                  Supprimer
                                </button>
                              </div>
                              {sw.logoUrl && (
                                <p className="text-slate-600 text-[10px] mt-1 line-clamp-1">
                                  {sw.logoUrl}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="w-full py-3 border-2 border-dashed border-slate-700/50 rounded-xl text-slate-500 hover:text-primary hover:border-primary/30 transition-colors text-xs font-bold flex items-center justify-center gap-1.5"
                      onClick={() =>
                        setSoftwaresDraft((prev) => [
                          ...(prev || []),
                          { _id: makeRowId(), name: "", url: "", logoUrl: "" },
                        ])
                      }
                    >
                      <span className="material-symbols-outlined text-sm">
                        add
                      </span>
                      Ajouter un logiciel
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Tags (filtres)
                  </label>
                  <textarea
                    name="tags"
                    rows="3"
                    defaultValue={formatTagsForTextarea(editItem.tags)}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
                    placeholder={"Ex:\nMixage\nVinyl\nBusiness"}
                  />
                  <p className="text-slate-600 text-[10px] mt-1">
                    Un tag par ligne (ou séparés par des virgules).
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Chapitres{" "}
                    <span className="text-slate-600 font-normal normal-case">
                      (1 ligne = horodatage + titre)
                    </span>
                  </label>
                  <textarea
                    name="chapters"
                    rows="5"
                    defaultValue={formatChaptersForTextarea(editItem.chapters)}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-xs"
                    placeholder={"00:00 Introduction\n02:10 Partie 1\n10:45 Conclusion"}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Liens utiles
                  </label>
                  <textarea
                    name="links"
                    rows="4"
                    defaultValue={formatPairsForTextarea(editItem.links)}
                    className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition-colors resize-none font-mono text-xs"
                    placeholder={"Ableton Live | https://ableton.com/...\nStore officiel | https://..."}
                  />
                  <p className="text-slate-600 text-[10px] mt-1">
                    1 lien par ligne au format `Titre | URL`.
                  </p>
                </div>

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
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditItem(null);
                    setSoftwaresDraft([]);
                  }}
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
                      <span className="w-4 h-4 border-2 border-[#0f1e23]/30 border-t-[#0f1e23] rounded-full animate-spin" />{" "}
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
      <ModalMasterclassCreate
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
