mod commands;
mod db;
mod models;

use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_data_dir = app.path().app_data_dir()?;
            let database = Database::new(app_data_dir)?;
            app.manage(database);

            Ok(())
        })
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::create_task,
            commands::update_task,
            commands::move_task,
            commands::archive_task,
            commands::get_archived_tasks,
            commands::restore_task,
            commands::delete_task,
            commands::export_tasks,
            commands::import_tasks,
            commands::get_stats,
            commands::get_checklist,
            commands::add_checklist_item,
            commands::toggle_checklist_item,
            commands::delete_checklist_item,
            commands::get_attachments,
            commands::add_attachment,
            commands::delete_attachment,
            commands::open_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
