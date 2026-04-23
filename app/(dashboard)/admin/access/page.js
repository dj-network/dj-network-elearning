import { asc } from "drizzle-orm";
import db from "@/libs/db";
import { elearnings, userAccess, users } from "@/libs/schema";
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

function buildAccessMap(accessRows) {
  const map = new Map();
  for (const row of accessRows) {
    if (!row.userId || !row.elearningId) continue;
    const list = map.get(row.userId) || [];
    list.push(row.elearningId);
    map.set(row.userId, list);
  }
  return map;
}

export default async function AdminAccessPage() {
  const [allUsers, formations, accessRows] = await Promise.all([
    db.select().from(users).orderBy(asc(users.email)),
    db.select().from(elearnings).orderBy(asc(elearnings.sortOrder), asc(elearnings.title)),
    db
      .select({
        userId: userAccess.userId,
        elearningId: userAccess.elearningId,
      })
      .from(userAccess),
  ]);

  const accessByUser = buildAccessMap(accessRows);
  const formationById = new Map(formations.map((formation) => [formation.id, formation]));

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <div className="mb-8 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-4xl">
            manage_accounts
          </span>
          <h1 className="text-3xl sm:text-4xl font-black">
            Accès élèves
          </h1>
        </div>
        <p className="text-slate-400">
          Créez les comptes LMS, attribuez les rôles et donnez accès aux
          formations e-learning.
        </p>
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

      <section className="space-y-4">
        {allUsers.map((user) => {
          const userFormationIds = accessByUser.get(user.id) || [];
          const accessibleFormations = userFormationIds
            .map((id) => formationById.get(id))
            .filter(Boolean);

          return (
            <article
              key={user.id}
              className="rounded-3xl border border-slate-800 bg-[#162a31] p-5 lg:p-6"
            >
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
                <div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black">
                        {user.name || user.email}
                      </h3>
                      <p className="text-slate-400">{user.email}</p>
                    </div>
                    <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-primary">
                      {roleLabel(user.role)}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {accessibleFormations.length > 0 ? (
                      accessibleFormations.map((formation) => (
                        <form
                          key={formation.id}
                          action={revokeElearningAccess}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#0f1e23] px-4 py-2"
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <input
                            type="hidden"
                            name="elearningId"
                            value={formation.id}
                          />
                          <span className="text-sm font-bold text-white">
                            {formation.title}
                          </span>
                          <button
                            type="submit"
                            className="text-slate-500 hover:text-red-300"
                            aria-label={`Retirer ${formation.title}`}
                          >
                            <span className="material-symbols-outlined text-lg">
                              close
                            </span>
                          </button>
                        </form>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        Aucune formation attribuée.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <form action={updateLmsUserRole} className="flex gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue={user.role || "user"}
                      className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-[#0f1e23] px-3 py-2 text-sm text-white outline-none focus:border-primary"
                    >
                      <option value="user">Élève</option>
                      <option value="formateur">Formateur</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-black text-primary hover:bg-primary/20"
                    >
                      Rôle
                    </button>
                  </form>

                  <form action={grantElearningAccess} className="flex gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="elearningId"
                      defaultValue=""
                      className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-[#0f1e23] px-3 py-2 text-sm text-white outline-none focus:border-primary"
                    >
                      <option value="" disabled>
                        Ajouter une formation
                      </option>
                      {formations.map((formation) => (
                        <option key={formation.id} value={formation.id}>
                          {formation.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-xl bg-primary px-3 py-2 text-sm font-black text-[#0f1e23] hover:bg-primary/90"
                    >
                      Ajouter
                    </button>
                  </form>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
