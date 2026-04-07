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

        let migration2 = include_str!("../migrations/002_add_label.sql");
        conn.execute_batch(migration2)?;

        let migration3 = include_str!("../migrations/003_create_checklists.sql");
        conn.execute_batch(migration3)?;

        let migration4 = include_str!("../migrations/004_create_attachments.sql");
        conn.execute_batch(migration4)?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }
}
