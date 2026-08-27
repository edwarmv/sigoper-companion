use std::net::TcpListener;
use std::sync::{Mutex, OnceLock};

static SHARED_SERVER: OnceLock<Mutex<Option<TcpListener>>> = OnceLock::new();

fn shared_server() -> &'static Mutex<Option<TcpListener>> {
    SHARED_SERVER.get_or_init(|| Mutex::new(None))
}

#[tauri::command]
fn start_shared_server(address: String) -> Result<u16, String> {
    let listener = TcpListener::bind((address.as_str(), 0))
        .map_err(|error| format!("could not bind shared server: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("could not read shared server port: {error}"))?
        .port();
    *shared_server()
        .lock()
        .map_err(|_| "server lock poisoned".to_string())? = Some(listener);
    Ok(port)
}

#[tauri::command]
fn stop_shared_server() -> Result<(), String> {
    *shared_server()
        .lock()
        .map_err(|_| "server lock poisoned".to_string())? = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_shared_server,
            stop_shared_server,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|error| eprintln!("error while running tauri application: {error}"));
}
