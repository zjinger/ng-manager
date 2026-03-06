import fp from "fastify-plugin";
import Database from "better-sqlite3";
import { env } from "../env";

export default fp(async function dbPlugin(fastify) {
  const db = new Database(env.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  fastify.decorate("db", db);

  fastify.addHook("onClose", async (instance) => {
    instance.db.close();
  });
});