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
      app.handle().plugin(tauri_plugin_sql::Builder::default().build())?;
      app.handle().plugin(tauri_plugin_shell::Builder::default().build())?;
      app.handle().plugin(tauri_plugin_notification::Builder::default().build())?;

      // Register system tray menu items
      let tray_menu = tauri::menu::Menu::with_id(app.handle(), "tray")?;
      let show = tauri::menu::MenuItem::with_id(app.handle(), "show", "Show Laude", true, None::<&str>)?;
      let quit = tauri::menu::MenuItem::with_id(app.handle(), "quit", "Quit", true, None::<&str>)?;
      tray_menu.append(&show)?;
      tray_menu.append(&quit)?;

      let _tray = tauri::tray::TrayIconBuilder::with_id("main_tray")
        .menu(&tray_menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "show" => {
            if let Some(webview) = app.get_webview_window("main") {
              let _ = webview.show();
              let _ = webview.set_focus();
            }
          }
          "quit" => {
            app.exit(0);
          }
          _ => {}
        })
        .build(app)?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
