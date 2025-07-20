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

    // rooms, here only have a window of 2 peers
    // so we can store the offer and answer in the same table
    // and the ice candidates for both peers
    // will be stored in the same table as well
    // this is a simple implementation for the sake of this example
    // in a real-world application, you might want to have a more complex structure
    // or use a different database system

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
