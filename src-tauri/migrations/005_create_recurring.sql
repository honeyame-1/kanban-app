CREATE TABLE IF NOT EXISTS recurring_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'normal',
    label TEXT DEFAULT '',
    recurrence TEXT NOT NULL CHECK(recurrence IN ('daily', 'weekly', 'monthly')),
    day_of_week INTEGER,
    day_of_month INTEGER,
    auto_due_days INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_generated TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
