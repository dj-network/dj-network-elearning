"use client";

import { useMemo, useState } from "react";
import {
  createLmsUser,
  grantElearningAccess,
  revokeElearningAccess,
  updateLmsUserRole,
} from "@/actions/lms-access";

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "formateur") return "Formateur";
  return "Élève";
}

function roleClass(role) {
  if (role === "admin") return "text-secondary bg-secondary/10 border-secondary/20";
  if (role === "formateur") return "text-amber-200 bg-amber-300/10 border-amber-300/20";
  return "text-primary bg-primary/10 border-primary/20";
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function UserDetailModal({ user, formations, onClose }) {
  const formationById = useMemo(
    () => new Map(formations.map((formation) => [formation.id, formation])),
    [formations],
  );
  const userFormations = user.formationIds
    .map((id) => formationById.get(id))
    .filter(Boolean);
  const availableFormations = formations.filter(
    (formation) => !user.formationIds.includes(formation.id),
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-[#162a31] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-[#162a31]/95 p-6 backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
              Détail élève
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {user.name || user.email}
            </h2>
            <p className="text-slate-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-700 bg-[#0f1e23] p-3 text-slate-400 hover:text-white"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-[#0f1e23] p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Rôle
              </p>
              <form action={updateLmsUserRole} className="mt-4 space-y-3">
                <input type="hidden" name="userId" value={user.id} />
                <select
                  name="role"
                  defaultValue={user.role || "user"}
                  className="w-full rounded-2xl border border-slate-800 bg-[#162a31] px-4 py-3 text-white outline-none focus:border-primary"
                >
                  <option value="user">Élève</option>
                  <option value="formateur">Formateur</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary px-4 py-3 font-black text-[#0f1e23] hover:bg-primary/90"
                >
                  Mettre à jour
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-[#0f1e23] p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Ajouter une formation
              </p>
              <form action={grantElearningAccess} className="mt-4 space-y-3">
                <input type="hidden" name="userId" value={user.id} />
                <select
                  name="elearningId"
                  defaultValue=""
                  className="w-full rounded-2xl border border-slate-800 bg-[#162a31] px-4 py-3 text-white outline-none focus:border-primary"
                >
                  <option value="" disabled>
                    Sélectionner
                  </option>
                  {availableFormations.map((formation) => (
                    <option key={formation.id} value={formation.id}>
                      {formation.title}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={availableFormations.length === 0}
                  className="w-full rounded-2xl bg-primary px-4 py-3 font-black text-[#0f1e23] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Ajouter
                </button>
              </form>
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-800 bg-[#0f1e23] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Formations attribuées
                </p>
                <h3 className="mt-1 text-xl font-black text-white">
                  {userFormations.length} accès
                </h3>
              </div>
            </div>

            {userFormations.length > 0 ? (
              <div className="space-y-3">
                {userFormations.map((formation) => (
                  <form
                    key={formation.id}
                    action={revokeElearningAccess}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#162a31] p-4"
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <input
                      type="hidden"
                      name="elearningId"
                      value={formation.id}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">
                        {formation.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formation.isPublished ? "Publié" : "Brouillon"}
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="shrink-0 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm font-black text-red-200 hover:bg-red-400/20"
                    >
                      Retirer
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
                Aucun accès attribué à cet élève.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AdminAccessTableClient({ users, formations }) {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const selectedUser = users.find((user) => user.id === selectedUserId);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return users;

    return users.filter((user) => {
      const haystack = [
        user.name,
        user.email,
        roleLabel(user.role),
        user.role,
      ]
        .map(normalizeText)
        .join(" ");
      return haystack.includes(normalizedQuery);
    });
  }, [query, users]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-4xl">
              manage_accounts
            </span>
            <h1 className="text-3xl sm:text-4xl font-black">Accès élèves</h1>
          </div>
          <p className="mt-2 max-w-2xl text-slate-400">
            Vue tableau pour gérer beaucoup d’élèves. Ouvrez le détail d’un
            élève pour modifier son rôle et ses accès LMS.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#162a31] px-5 py-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Comptes
          </p>
          <p className="text-3xl font-black text-primary">{users.length}</p>
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-slate-800 bg-[#162a31] p-6">
        <h2 className="mb-5 text-2xl font-black">Créer un compte</h2>
        <form action={createLmsUser} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <input
            name="name"
            required
            placeholder="Nom complet"
            className="rounded-2xl border border-slate-800 bg-[#0f1e23] px-4 py-3 text-white outline-none focus:border-primary"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email@exemple.com"
            className="rounded-2xl border border-slate-800 bg-[#0f1e23] px-4 py-3 text-white outline-none focus:border-primary"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Mot de passe"
            className="rounded-2xl border border-slate-800 bg-[#0f1e23] px-4 py-3 text-white outline-none focus:border-primary"
          />
          <select
            name="role"
            defaultValue="user"
            className="rounded-2xl border border-slate-800 bg-[#0f1e23] px-4 py-3 text-white outline-none focus:border-primary"
          >
            <option value="user">Élève</option>
            <option value="formateur">Formateur</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-primary px-5 py-3 font-black text-[#0f1e23] hover:bg-primary/90 transition-colors"
          >
            Créer
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-[#162a31] overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-800 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Liste des élèves</h2>
            <p className="text-sm text-slate-500">
              {filteredUsers.length} compte{filteredUsers.length > 1 ? "s" : ""} affiché
              {filteredUsers.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher nom, email, rôle..."
              className="w-full rounded-2xl border border-slate-800 bg-[#0f1e23] py-3 pl-12 pr-4 text-white outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#0f1e23] text-xs font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-5 py-4">Élève</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Rôle</th>
                <th className="px-5 py-4">Accès LMS</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#0f1e23]/60">
                  <td className="px-5 py-4">
                    <div className="font-black text-white">
                      {user.name || "Sans nom"}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${roleClass(user.role)}`}>
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-black text-primary">
                      {user.formationIds.length}
                    </span>{" "}
                    <span className="text-slate-500">
                      formation{user.formationIds.length > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-black text-primary hover:bg-primary/20"
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Aucun élève ne correspond à cette recherche.
          </div>
        ) : null}
      </section>

      {selectedUser ? (
        <UserDetailModal
          user={selectedUser}
          formations={formations}
          onClose={() => setSelectedUserId(null)}
        />
      ) : null}
    </div>
  );
}
