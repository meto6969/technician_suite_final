const Database = require("better-sqlite3");

// ملف قاعدة البيانات سيُنشأ بجانب السيرفر
const db = new Database("data.sqlite");

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'tech'
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      issue TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      technician_id INTEGER NOT NULL,
      scheduled_for TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (technician_id) REFERENCES technicians(id)
    );
  `);
}

module.exports = { db, initDb };
