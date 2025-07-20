import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";

import { join } from "path";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }
  try {
    const dbPath = join(process.cwd(), "database.sqlite");

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // we will be storing 

    await db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        offer TEXT,
        answer TEXT,
        offer_ice_candidates TEXT,
        answer_ice_candidates TEXT
      )
    `);

    console.log("Database connection established and table created.");
    return db;
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    // If the connection fails, we should throw the error to prevent the app from running in a broken state.
    throw new Error("Failed to initialize the database connection.");
  }
}

export default db;
