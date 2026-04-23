import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const client = createClient({
  url: process.env.TURSO_URL_DATABASE,
  authToken: process.env.TURSO_URL_TOKEN,
});

const db = drizzle(client);

export default db;
