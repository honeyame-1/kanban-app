CREATE INDEX IF NOT EXISTS idx_tasks_label ON tasks(label);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
