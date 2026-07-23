use tauri::{Manager, Emitter};

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
      app.handle().plugin(tauri_plugin_shell::init())?;
      app.handle().plugin(tauri_plugin_fs::init())?;
      app.handle().plugin(tauri_plugin_dialog::init())?;
      app.handle().plugin(tauri_plugin_notification::init())?;
      app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

      // Register system tray menu items
      let tray_menu = tauri::menu::Menu::with_id(app.handle(), "tray")?;
      let show = tauri::menu::MenuItem::with_id(app.handle(), "show", "Show VEGA", true, None::<&str>)?;
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
    .invoke_handler(tauri::generate_handler![mcp_spawn, mcp_send, mcp_kill])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

use std::collections::HashMap;
use std::process::{Child, Command as StdCommand, Stdio};
use std::io::{BufRead, BufReader, Write};
use std::sync::{Arc, Mutex};
use std::thread;

lazy_static::lazy_static! {
    static ref MCP_PROCESSES: Arc<Mutex<HashMap<String, Child>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
async fn mcp_spawn(app: tauri::AppHandle, name: String, cmd: String, args: Vec<String>, env: HashMap<String, String>) -> Result<(), String> {
    mcp_kill(name.clone()).await?;

    let mut process_cmd = StdCommand::new(&cmd);
    process_cmd.args(&args);
    process_cmd.stdin(Stdio::piped());
    process_cmd.stdout(Stdio::piped());
    process_cmd.stderr(Stdio::piped());

    for (k, v) in env {
        process_cmd.env(k, v);
    }

    let mut child = process_cmd.spawn().map_err(|e| format!("Failed to spawn {}: {}", cmd, e))?;
    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to open stderr")?;

    {
        let mut map = MCP_PROCESSES.lock().unwrap();
        map.insert(name.clone(), child);
    }

    let app_clone1 = app.clone();
    let name_clone1 = name.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(content) => {
                    let _ = app_clone1.emit(&format!("mcp-stdout-{}", name_clone1), content);
                }
                Err(_) => break,
            }
        }
    });

    let app_clone2 = app.clone();
    let name_clone2 = name.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            match line {
                Ok(content) => {
                    let _ = app_clone2.emit(&format!("mcp-stderr-{}", name_clone2), content);
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn mcp_send(name: String, message: String) -> Result<(), String> {
    let mut map = MCP_PROCESSES.lock().unwrap();
    if let Some(child) = map.get_mut(&name) {
        if let Some(stdin) = child.stdin.as_mut() {
            writeln!(stdin, "{}", message)
                .map_err(|e| format!("Failed to write to stdin: {}", e))?;
            stdin.flush().map_err(|e| format!("Failed to flush stdin: {}", e))?;
            Ok(())
        } else {
            Err("No stdin pipe available".to_string())
        }
    } else {
        Err(format!("Process {} not found", name))
    }
}

#[tauri::command]
async fn mcp_kill(name: String) -> Result<(), String> {
    let mut map = MCP_PROCESSES.lock().unwrap();
    if let Some(mut child) = map.remove(&name) {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

