use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub position: i64,
    pub archived: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskInput {
    pub id: i64,
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MoveTaskInput {
    pub id: i64,
    pub status: String,
    pub position: i64,
}

#[derive(Debug, Deserialize)]
pub struct GetTasksFilter {
    pub search: Option<String>,
    pub priority: Option<String>,
    pub due_filter: Option<String>,
}
