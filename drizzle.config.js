import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./libs/schema.js",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_URL_DATABASE,
    authToken: process.env.TURSO_URL_TOKEN,
  },
});
