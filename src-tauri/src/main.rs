// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

fn parse_unread_count(title: &str) -> u32 {
    title.strip_prefix('(')
        .and_then(|s| s.find(')').map(|i| &s[..i]))
        .and_then(|n| n.parse().ok())
        .unwrap_or(0)
}
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
#[cfg(target_os = "windows")]
use window_vibrancy::apply_mica;

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
                let _ = app.emit("single-instance", Payload { args: argv, cwd });
            }))?;

            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let hide = MenuItemBuilder::with_id("hide", "Hide").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&hide, &quit])
                .build()?;

            let _tray = TrayIconBuilder::with_id("main")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(visible) = window.is_visible() {
                                if visible {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                }
                            }
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, Some(10.0))
                .expect("Failed to apply vibrancy");

            #[cfg(target_os = "windows")]
            apply_mica(&window, None)
                .expect("Failed to apply Mica");

            tauri::async_runtime::spawn(async move {
                let _ = window.eval("window.location.replace('https://mail.google.com/chat/u/0')");
            });

            let poll_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last_count: u32 = 0;
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    let Some(win) = poll_handle.get_webview_window("main") else { continue };
                    let count = win.title().ok()
                        .map(|t| parse_unread_count(&t))
                        .unwrap_or(0);
                    if count != last_count {
                        last_count = count;
                        if let Some(tray) = poll_handle.tray_by_id("main") {
                            let tooltip = if count > 0 {
                                format!("Google Chat ({count} unread)")
                            } else {
                                "Google Chat".to_string()
                            };
                            let _ = tray.set_tooltip(Some(&tooltip));
                        }
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}
