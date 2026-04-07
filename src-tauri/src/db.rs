use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        fs::create_dir_all(&app_dir)?;
        let db_path = app_dir.join("kanban.db");
        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        let migration = include_str!("../migrations/001_create_tasks.sql");
        conn.execute_batch(migration)?;

        // Migration 002: add label column (idempotent)
        let has_label: bool = conn
            .prepare("PRAGMA table_info(tasks)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .any(|col| col.as_deref() == Ok("label"));
        if !has_label {
            let migration2 = include_str!("../migrations/002_add_label.sql");
            conn.execute_batch(migration2)?;
        }

        let migration3 = include_str!("../migrations/003_create_checklists.sql");
        conn.execute_batch(migration3)?;

        let migration4 = include_str!("../migrations/004_create_attachments.sql");
        conn.execute_batch(migration4)?;

        let migration5 = include_str!("../migrations/005_create_recurring.sql");
        conn.execute_batch(migration5)?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }
}
