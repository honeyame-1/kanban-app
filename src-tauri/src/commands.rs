use tauri::State;

use crate::db::Database;
use crate::models::{CreateTaskInput, GetTasksFilter, MoveTaskInput, Task, UpdateTaskInput};

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        status: row.get(3)?,
        priority: row.get(4)?,
        due_date: row.get(5)?,
        position: row.get(6)?,
        archived: row.get::<_, i64>(7)? != 0,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

#[tauri::command]
pub fn get_tasks(filter: GetTasksFilter, db: State<Database>) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut conditions: Vec<String> = vec!["archived = 0".to_string()];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    if let Some(ref search) = filter.search {
        if !search.is_empty() {
            conditions.push("(title LIKE ? OR description LIKE ?)".to_string());
            let pattern = format!("%{}%", search);
            params.push(Box::new(pattern.clone()));
            params.push(Box::new(pattern));
        }
    }

    if let Some(ref priority) = filter.priority {
        if !priority.is_empty() {
            conditions.push("priority = ?".to_string());
            params.push(Box::new(priority.clone()));
        }
    }

    if let Some(ref due_filter) = filter.due_filter {
        match due_filter.as_str() {
            "today" => {
                conditions.push("due_date IS NOT NULL AND due_date <= date('now')".to_string());
            }
            "week" => {
                conditions.push(
                    "due_date IS NOT NULL AND due_date <= date('now', '+7 days')".to_string(),
                );
            }
            "next_week" => {
                conditions.push(
                    "due_date IS NOT NULL AND due_date <= date('now', '+14 days')".to_string(),
                );
            }
            _ => {}
        }
    }

    if let Some(ref due_date_until) = filter.due_date_until {
        if !due_date_until.is_empty() {
            conditions.push("due_date IS NOT NULL AND due_date <= ?".to_string());
            params.push(Box::new(due_date_until.clone()));
        }
    }

    let where_clause = conditions.join(" AND ");
    let sql = format!(
        "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at \
         FROM tasks WHERE {} ORDER BY status, position ASC",
        where_clause
    );

    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let tasks = stmt
        .query_map(param_refs.as_slice(), map_row)
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<Task>>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn create_task(input: CreateTaskInput, db: State<Database>) -> Result<Task, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Shift existing todo tasks down by 1
    conn.execute(
        "UPDATE tasks SET position = position + 1 WHERE status = 'todo' AND archived = 0",
        [],
    )
    .map_err(|e| e.to_string())?;

    let description = input.description.unwrap_or_default();
    let priority = input.priority.unwrap_or_else(|| "normal".to_string());

    conn.execute(
        "INSERT INTO tasks (title, description, status, priority, due_date, position, archived, created_at, updated_at) \
         VALUES (?, ?, 'todo', ?, ?, 0, 0, datetime('now'), datetime('now'))",
        rusqlite::params![input.title, description, priority, input.due_date],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let task = conn
        .query_row(
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at \
             FROM tasks WHERE id = ?",
            rusqlite::params![id],
            map_row,
        )
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn update_task(input: UpdateTaskInput, db: State<Database>) -> Result<Task, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut set_clauses: Vec<String> = vec!["updated_at = datetime('now')".to_string()];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    if let Some(ref title) = input.title {
        set_clauses.push("title = ?".to_string());
        params.push(Box::new(title.clone()));
    }

    if let Some(ref description) = input.description {
        set_clauses.push("description = ?".to_string());
        params.push(Box::new(description.clone()));
    }

    if let Some(ref priority) = input.priority {
        set_clauses.push("priority = ?".to_string());
        params.push(Box::new(priority.clone()));
    }

    if input.due_date.is_some() || input.title.is_none() {
        // Always update due_date if provided (even None to clear it)
        set_clauses.push("due_date = ?".to_string());
        params.push(Box::new(input.due_date.clone()));
    }

    params.push(Box::new(input.id));

    let sql = format!(
        "UPDATE tasks SET {} WHERE id = ?",
        set_clauses.join(", ")
    );

    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| e.to_string())?;

    let task = conn
        .query_row(
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at \
             FROM tasks WHERE id = ?",
            rusqlite::params![input.id],
            map_row,
        )
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn move_task(input: MoveTaskInput, db: State<Database>) -> Result<Task, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Shift tasks in the target column at or after the target position
    conn.execute(
        "UPDATE tasks SET position = position + 1 \
         WHERE status = ? AND position >= ? AND id != ? AND archived = 0",
        rusqlite::params![input.status, input.position, input.id],
    )
    .map_err(|e| e.to_string())?;

    // Move the task to new status and position
    conn.execute(
        "UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now') WHERE id = ?",
        rusqlite::params![input.status, input.position, input.id],
    )
    .map_err(|e| e.to_string())?;

    let task = conn
        .query_row(
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at \
             FROM tasks WHERE id = ?",
            rusqlite::params![input.id],
            map_row,
        )
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn archive_task(id: i64, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tasks SET archived = 1, updated_at = datetime('now') WHERE id = ?",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_archived_tasks(db: State<Database>) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at \
             FROM tasks WHERE archived = 1 ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map([], map_row)
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<Task>>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn restore_task(id: i64, db: State<Database>) -> Result<Task, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Shift existing todo tasks down by 1 to make room at position 0
    conn.execute(
        "UPDATE tasks SET position = position + 1 WHERE status = 'todo' AND archived = 0",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE tasks SET archived = 0, status = 'todo', position = 0, updated_at = datetime('now') WHERE id = ?",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;

    let task = conn
        .query_row(
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at \
             FROM tasks WHERE id = ?",
            rusqlite::params![id],
            map_row,
        )
        .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn delete_task(id: i64, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks WHERE id = ?", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
