use chrono::Datelike;
use tauri::State;

use crate::db::Database;
use crate::models::{Attachment, ChecklistItem, CreateRecurringInput, CreateTaskInput, GetTasksFilter, MoveTaskInput, RecurringTask, Task, UpdateTaskInput};

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
        label: row.get::<_, Option<String>>(10)?.unwrap_or_default(),
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

    if let Some(ref label) = filter.label {
        if !label.is_empty() {
            conditions.push("label = ?".to_string());
            params.push(Box::new(label.clone()));
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
        "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at, label \
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
    let label = input.label.unwrap_or_default();

    conn.execute(
        "INSERT INTO tasks (title, description, status, priority, due_date, position, archived, created_at, updated_at, label) \
         VALUES (?, ?, 'todo', ?, ?, 0, 0, datetime('now'), datetime('now'), ?)",
        rusqlite::params![input.title, description, priority, input.due_date, label],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let task = conn
        .query_row(
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at, label \
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

    if let Some(ref label) = input.label {
        set_clauses.push("label = ?".to_string());
        params.push(Box::new(label.clone()));
    }

    if input.due_date.is_some() {
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
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at, label \
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
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at, label \
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
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at, label \
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
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at, label \
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

#[tauri::command]
pub fn export_tasks(db: State<Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, status, priority, due_date, position, archived, created_at, updated_at, label \
             FROM tasks ORDER BY status, position ASC",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map([], map_row)
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<Task>>>()
        .map_err(|e| e.to_string())?;

    serde_json::to_string_pretty(&tasks).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_tasks(db: State<Database>, json_data: String) -> Result<(), String> {
    let tasks: Vec<Task> = serde_json::from_str(&json_data).map_err(|e| e.to_string())?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute_batch("BEGIN").map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks", []).map_err(|e| e.to_string())?;

    for task in tasks {
        conn.execute(
            "INSERT INTO tasks (title, description, status, priority, due_date, position, archived, created_at, updated_at, label) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                task.title,
                task.description,
                task.status,
                task.priority,
                task.due_date,
                task.position,
                task.archived as i64,
                task.created_at,
                task.updated_at,
                task.label
            ],
        )
        .map_err(|e| {
            let _ = conn.execute_batch("ROLLBACK");
            e.to_string()
        })?;
    }

    conn.execute_batch("COMMIT").map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_stats(db: State<Database>) -> Result<serde_json::Value, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // This month's submitted count
    let this_month_submitted: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE status = 'submitted' AND created_at >= date('now', 'start of month')",
        [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // Total active tasks
    let total_active: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE archived = 0",
        [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // Total archived
    let total_archived: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE archived = 1",
        [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // Overdue count
    let overdue: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE archived = 0 AND due_date IS NOT NULL AND due_date < date('now')",
        [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // By priority counts
    let by_priority_sql = "SELECT priority, COUNT(*) FROM tasks WHERE archived = 0 GROUP BY priority";
    let mut stmt = conn.prepare(by_priority_sql).map_err(|e| e.to_string())?;
    let priority_rows: Vec<(String, i64)> = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut priority_map = serde_json::Map::new();
    for (p, c) in priority_rows {
        priority_map.insert(p, serde_json::Value::Number(c.into()));
    }

    Ok(serde_json::json!({
        "this_month_submitted": this_month_submitted,
        "total_active": total_active,
        "total_archived": total_archived,
        "overdue": overdue,
        "by_priority": priority_map,
    }))
}

#[tauri::command]
pub fn get_checklist(task_id: i64, db: State<Database>) -> Result<Vec<ChecklistItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, task_id, text, checked, position FROM checklist_items WHERE task_id = ? ORDER BY position ASC"
    ).map_err(|e| e.to_string())?;
    let items = stmt.query_map(rusqlite::params![task_id], |row| {
        Ok(ChecklistItem {
            id: row.get(0)?,
            task_id: row.get(1)?,
            text: row.get(2)?,
            checked: row.get::<_, i64>(3)? != 0,
            position: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;
    Ok(items)
}

#[tauri::command]
pub fn add_checklist_item(task_id: i64, text: String, db: State<Database>) -> Result<ChecklistItem, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM checklist_items WHERE task_id = ?",
        rusqlite::params![task_id], |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO checklist_items (task_id, text, position) VALUES (?, ?, ?)",
        rusqlite::params![task_id, text, position],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(ChecklistItem { id, task_id, text, checked: false, position })
}

#[tauri::command]
pub fn toggle_checklist_item(id: i64, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE checklist_items SET checked = CASE WHEN checked = 0 THEN 1 ELSE 0 END WHERE id = ?",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_checklist_item(id: i64, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM checklist_items WHERE id = ?", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_attachments(task_id: i64, db: State<Database>) -> Result<Vec<Attachment>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, task_id, file_name, file_path, created_at FROM attachments WHERE task_id = ? ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;
    let items = stmt.query_map(rusqlite::params![task_id], |row| {
        Ok(Attachment {
            id: row.get(0)?,
            task_id: row.get(1)?,
            file_name: row.get(2)?,
            file_path: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;
    Ok(items)
}

#[tauri::command]
pub fn add_attachment(task_id: i64, file_name: String, file_path: String, db: State<Database>) -> Result<Attachment, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO attachments (task_id, file_name, file_path) VALUES (?, ?, ?)",
        rusqlite::params![task_id, file_name, file_path],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let att = conn.query_row(
        "SELECT id, task_id, file_name, file_path, created_at FROM attachments WHERE id = ?",
        rusqlite::params![id],
        |row| Ok(Attachment {
            id: row.get(0)?,
            task_id: row.get(1)?,
            file_name: row.get(2)?,
            file_path: row.get(3)?,
            created_at: row.get(4)?,
        }),
    ).map_err(|e| e.to_string())?;
    Ok(att)
}

#[tauri::command]
pub fn delete_attachment(id: i64, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM attachments WHERE id = ?", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    // Validate path: reject shell metacharacters
    if path.contains('&') || path.contains('|') || path.contains(';') || path.contains('`') {
        return Err("Invalid file path".to_string());
    }
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// === Recurring Tasks ===

fn map_recurring_row(row: &rusqlite::Row) -> rusqlite::Result<RecurringTask> {
    Ok(RecurringTask {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
        priority: row.get(3)?,
        label: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
        recurrence: row.get(5)?,
        day_of_week: row.get(6)?,
        day_of_month: row.get(7)?,
        auto_due_days: row.get(8)?,
        enabled: row.get::<_, i64>(9)? != 0,
        last_generated: row.get(10)?,
    })
}

#[tauri::command]
pub fn get_recurring_tasks(db: State<Database>) -> Result<Vec<RecurringTask>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, title, description, priority, label, recurrence, day_of_week, day_of_month, auto_due_days, enabled, last_generated FROM recurring_tasks ORDER BY id ASC"
    ).map_err(|e| e.to_string())?;
    let items = stmt.query_map([], map_recurring_row)
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(items)
}

#[tauri::command]
pub fn create_recurring_task(input: CreateRecurringInput, db: State<Database>) -> Result<RecurringTask, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO recurring_tasks (title, description, priority, label, recurrence, day_of_week, day_of_month, auto_due_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            input.title,
            input.description.unwrap_or_default(),
            input.priority.unwrap_or_else(|| "normal".to_string()),
            input.label.unwrap_or_default(),
            input.recurrence,
            input.day_of_week,
            input.day_of_month,
            input.auto_due_days.unwrap_or(0),
        ],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let task = conn.query_row(
        "SELECT id, title, description, priority, label, recurrence, day_of_week, day_of_month, auto_due_days, enabled, last_generated FROM recurring_tasks WHERE id = ?",
        rusqlite::params![id], map_recurring_row,
    ).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
pub fn delete_recurring_task(id: i64, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM recurring_tasks WHERE id = ?", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_recurring_task(id: i64, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE recurring_tasks SET enabled = CASE WHEN enabled = 0 THEN 1 ELSE 0 END WHERE id = ?",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn generate_recurring_tasks(db: State<Database>) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let weekday = chrono::Local::now().weekday().num_days_from_monday() as i64; // 0=Mon..6=Sun

    let mut stmt = conn.prepare(
        "SELECT id, title, description, priority, label, recurrence, day_of_week, day_of_month, auto_due_days, enabled, last_generated FROM recurring_tasks WHERE enabled = 1"
    ).map_err(|e| e.to_string())?;

    let recurrings: Vec<RecurringTask> = stmt.query_map([], map_recurring_row)
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    let mut count: i64 = 0;

    for rt in recurrings {
        if rt.last_generated.as_deref() == Some(&today) {
            continue; // already generated today
        }

        let should_generate = match rt.recurrence.as_str() {
            "daily" => true,
            "weekly" => rt.day_of_week.map_or(false, |d| d == weekday),
            "monthly" => {
                let day_of_month = chrono::Local::now().day() as i64;
                rt.day_of_month.map_or(false, |d| d == day_of_month)
            }
            _ => false,
        };

        if should_generate {
            let due_date = if rt.auto_due_days > 0 {
                let due = chrono::Local::now() + chrono::Duration::days(rt.auto_due_days);
                Some(due.format("%Y-%m-%d").to_string())
            } else {
                None
            };

            conn.execute(
                "UPDATE tasks SET position = position + 1 WHERE status = 'todo' AND archived = 0",
                [],
            ).map_err(|e| e.to_string())?;

            conn.execute(
                "INSERT INTO tasks (title, description, status, priority, due_date, position, archived, created_at, updated_at, label) VALUES (?, ?, 'todo', ?, ?, 0, 0, datetime('now'), datetime('now'), ?)",
                rusqlite::params![rt.title, rt.description, rt.priority, due_date, rt.label],
            ).map_err(|e| e.to_string())?;

            conn.execute(
                "UPDATE recurring_tasks SET last_generated = ? WHERE id = ?",
                rusqlite::params![today, rt.id],
            ).map_err(|e| e.to_string())?;

            count += 1;
        }
    }

    Ok(count)
}

// === Weather ===

#[tauri::command]
pub fn get_weather(lat: f64, lon: f64) -> Result<serde_json::Value, String> {
    let url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Seoul",
        lat, lon
    );
    let body: serde_json::Value = ureq::get(&url).call().map_err(|e| e.to_string())?
        .into_json::<serde_json::Value>().map_err(|e| e.to_string())?;

    let current = &body["current"];
    let temp = current["temperature_2m"].as_f64().unwrap_or(0.0);
    let humidity = current["relative_humidity_2m"].as_f64().unwrap_or(0.0);
    let wind = current["wind_speed_10m"].as_f64().unwrap_or(0.0);
    let code = current["weather_code"].as_i64().unwrap_or(0);

    let desc = match code {
        0 => "맑음 ☀️",
        1 | 2 => "구름 조금 🌤️",
        3 => "흐림 ☁️",
        45 | 48 => "안개 🌫️",
        51 | 53 | 55 => "이슬비 🌦️",
        61 | 63 | 65 => "비 🌧️",
        66 | 67 => "눈비 🌨️",
        71 | 73 | 75 | 77 => "눈 ❄️",
        80 | 81 | 82 => "소나기 🌧️",
        85 | 86 => "눈보라 ❄️",
        95 | 96 | 99 => "뇌우 ⛈️",
        _ => "알 수 없음",
    };

    Ok(serde_json::json!({
        "temp": format!("{:.0}°C", temp),
        "humidity": format!("{}%", humidity as i64),
        "wind": format!("{:.0}m/s", wind),
        "desc": desc,
    }))
}
