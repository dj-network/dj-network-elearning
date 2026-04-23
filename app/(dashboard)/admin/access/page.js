import { asc, sql } from "drizzle-orm";
import db from "@/libs/db";
import { elearnings, userAccess, users } from "@/libs/schema";
import AdminAccessTableClient from "./AdminAccessTableClient";

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
    db.select().from(users).where(sql`${users.role} != 'admin'`).orderBy(asc(users.email)),
    db
      .select()
      .from(elearnings)
      .orderBy(asc(elearnings.sortOrder), asc(elearnings.title)),
    db
      .select({
        userId: userAccess.userId,
        elearningId: userAccess.elearningId,
      })
      .from(userAccess),
  ]);

  const accessByUser = buildAccessMap(accessRows);

  const userRows = allUsers.map((user) => ({
    id: user.id,
    name: user.name || "",
    email: user.email,
    role: user.role || "user",
    image: user.image || "",
    formationIds: accessByUser.get(user.id) || [],
  }));

  const formationRows = formations.map((formation) => ({
    id: formation.id,
    title: formation.title,
    slug: formation.slug,
    isPublished: formation.isPublished !== false,
  }));

  return (
    <AdminAccessTableClient users={userRows} formations={formationRows} />
  );
}
