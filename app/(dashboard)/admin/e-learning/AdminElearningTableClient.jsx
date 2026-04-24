"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteElearning, reorderElearnings } from "@/actions/elearning";
import { resolveMediaUrl } from "@/libs/media";
import AdminElearningMetadataEditor from "./[id]/AdminElearningMetadataEditor";

export default function AdminElearningTableClient({ items }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState("sortOrder");
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [localItems, setLocalItems] = useState(() => items || []);
  const [dragElearningId, setDragElearningId] = useState(null);
  const [dragOverElearningId, setDragOverElearningId] = useState(null);

  const filteredItems = useMemo(() => {
    const list = [...localItems];
    if (search.trim()) {
      const q = search.toLowerCase();
      return list
        .filter(
          (item) =>
            item.title?.toLowerCase().includes(q) ||
            item.instructor?.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q) ||
            item.slug?.toLowerCase().includes(q),
        )
        .sort((a, b) => {
          let aVal = a[sortKey] ?? "";
          let bVal = b[sortKey] ?? "";
          if (typeof aVal === "string") aVal = aVal.toLowerCase();
          if (typeof bVal === "string") bVal = bVal.toLowerCase();
          if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
          if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
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

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDropElearning(targetElearningId) {
    if (!dragElearningId || !canReorder) return;
    if (dragElearningId === targetElearningId) return;

    const list = [...localItems];
    const fromIdx = list.findIndex((item) => item.id === dragElearningId);
    const toIdx = list.findIndex((item) => item.id === targetElearningId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    const normalized = list.map((item, idx) => ({ ...item, sortOrder: idx }));
    setLocalItems(normalized);

    setSaving(true);
    const res = await reorderElearnings(normalized.map((item) => item.id));
    setSaving(false);
    setDragElearningId(null);
    setDragOverElearningId(null);

    if (res?.error) {
      alert(res.error);
      router.refresh();
      return;
    }

    router.refresh();
  }

  async function handleDelete(item) {
    const res = await deleteElearning(item.id);
    if (res.error) alert(res.error);
    setDeleteConfirm(null);
    router.refresh();
  }

  function renderSortIcon(col) {
    if (sortKey !== col) {
      return (
        <span className="material-symbols-outlined text-slate-600 text-sm">
          unfold_more
        </span>
      );
    }
    return (
      <span className="material-symbols-outlined text-primary text-sm">
        {sortDir === "asc" ? "arrow_upward" : "arrow_downward"}
      </span>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0f1e23] border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-primary transition-colors placeholder:text-slate-500"
            placeholder="Rechercher une formation..."
          />
        </div>

        <div className="flex flex-col gap-1 text-xs text-slate-500 sm:ml-auto sm:items-end">
          <span>{filteredItems.length} formation(s)</span>
          <span className="hidden sm:inline">
            {canReorder
              ? "Glisse les lignes pour changer l'ordre"
              : "Réordonner disponible seulement en vue par défaut"}
          </span>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredItems.map((item, idx) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-800 bg-[#162a31] p-4"
          >
            <div className="flex gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-800">
                {item.imageUrl ? (
                  <img
                    src={resolveMediaUrl(item.imageUrl)}
                    alt=""
                    className="block h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-1 text-center text-[8px] font-bold uppercase leading-tight text-slate-500">
                    image non choisie
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-base font-black leading-tight text-white">
                    {item.title}
                  </p>
                  {!item.isPublished ? (
                    <span className="shrink-0 rounded-lg bg-amber-400/15 px-2 py-1 text-[10px] font-black uppercase text-amber-200">
                      Brouillon
                    </span>
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  #{idx + 1} · {item.duration || "—"} · {item.level || "Tous niveaux"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {item.instructor || "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="rounded-xl bg-[#0f1e23] px-3 py-2">
                <p className="text-slate-500">Modules</p>
                <p className="font-black text-white">{item.courseCount || 0}</p>
              </div>
              <div className="rounded-xl bg-[#0f1e23] px-3 py-2">
                <p className="text-slate-500">Leçons</p>
                <p className="font-black text-white">{item.lessonCount || 0}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href={`/formations/${item.slug}`}
                target="_blank"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700"
                title="Visualiser"
              >
                <span className="material-symbols-outlined text-lg">
                  visibility
                </span>
                Voir
              </Link>
              <Link
                href={`/admin/e-learning/${item.id}`}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-black text-[#0f1e23] transition-colors hover:bg-primary/90"
                title="Gérer"
              >
                <span className="material-symbols-outlined text-lg">tune</span>
                Gérer
              </Link>
              <AdminElearningMetadataEditor mc={item} />
              <button
                onClick={() => setDeleteConfirm(item)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                title="Supprimer"
                aria-label={`Supprimer ${item.title}`}
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </article>
        ))}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#162a31] p-8 text-center text-slate-500">
            Aucune formation trouvée.
          </div>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-[#162a31] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-3 w-12"></th>
                <th className="px-2 py-3 w-12"></th>
                <th
                  className="px-4 py-3 cursor-pointer select-none min-w-[260px]"
                  onClick={() => handleSort("title")}
                >
                  <span className="flex items-center gap-1 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Titre {renderSortIcon("title")}
                  </span>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hidden md:table-cell"
                  onClick={() => handleSort("category")}
                >
                  <span className="flex items-center gap-1 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Catégorie {renderSortIcon("category")}
                  </span>
                </th>
                <th className="px-4 py-3 hidden lg:table-cell min-w-[180px]">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Contenu
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
                    if (!dragElearningId || !canReorder) return;
                    e.preventDefault();
                    setDragOverElearningId(item.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverElearningId === item.id) setDragOverElearningId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropElearning(item.id);
                  }}
                  className={`border-b border-slate-800/50 hover:bg-[#0f1e23]/50 transition-colors ${
                    dragOverElearningId === item.id ? "bg-primary/10" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800">
                      {item.imageUrl ? (
                        <img
                          src={resolveMediaUrl(item.imageUrl)}
                          alt=""
                          className="w-full h-full object-cover block"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-500 font-bold uppercase text-center p-1 leading-tight">
                          image non choisie
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      draggable={canReorder}
                      onDragStart={(e) => {
                        if (!canReorder) return;
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", item.id);
                        setDragElearningId(item.id);
                      }}
                      onDragEnd={() => {
                        setDragElearningId(null);
                        setDragOverElearningId(null);
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
                  <td className="px-4 py-3 min-w-[260px]">
                    <p className="text-white font-bold text-sm leading-tight line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {[item.duration, item.level || "Tous niveaux", item.instructor || "—"]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                      {item.category || "Formation"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell min-w-[180px]">
                    <span className="whitespace-nowrap text-xs text-slate-500">
                      {item.courseCount || 0} module(s) • {item.lessonCount || 0} leçon(s)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/formations/${item.slug}`}
                        target="_blank"
                        className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
                        title="Visualiser"
                      >
                        <span className="material-symbols-outlined text-sm">
                          visibility
                        </span>
                      </Link>
                      <Link
                        href={`/admin/e-learning/${item.id}`}
                        className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
                        title="Gérer"
                      >
                        <span className="material-symbols-outlined text-sm">
                          tune
                        </span>
                        Gérer
                      </Link>
                      <AdminElearningMetadataEditor mc={item} />
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
                    Aucune formation trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e23]/80 backdrop-blur-sm p-4">
          <div className="bg-[#162a31] border border-slate-700/50 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
            <span className="material-symbols-outlined text-red-400 text-5xl mb-4">
              warning
            </span>
            <h3 className="text-xl font-bold text-white mb-2">Supprimer ?</h3>
            <p className="text-slate-400 mb-6">
              Supprimer <strong className="text-white">{deleteConfirm.title}</strong> ?
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

      {saving && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-primary/30 bg-[#162a31] px-4 py-3 text-sm font-medium text-white shadow-2xl">
          Enregistrement de l&apos;ordre...
        </div>
      )}
    </>
  );
}
