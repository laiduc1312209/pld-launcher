mod auth;
mod sync;
mod launcher;

use auth::{AuthState, UserSession, GameData, verify_password, hash_password};
use sync::{CloudSync, zip_folder, unzip_file};
use launcher::launch_and_wait;
use tauri::State;
use tauri_plugin_log;
use tauri_plugin_shell;
use tauri_plugin_fs;
use tauri_plugin_process;
use mongodb::bson::{doc, oid::ObjectId};
use std::sync::Mutex;


// --- Config ---
const MONGODB_URI: &str = "mongodb+srv://laiduc1312:duc@cluster0.gg9xrx3.mongodb.net/?appName=Cluster0";
const DB_NAME: &str = "pld_launcher_db";

const B2_KEY_ID: &str = "003020e8d4de7630000000001";
const B2_APP_KEY: &str = "K003AUH0j3Lii+ApA9Topt4oxvqEXjk";
const B2_ENDPOINT: &str = "s3.eu-central-003.backblazeb2.com";
const B2_BUCKET: &str = "pld-launcher-saves";

struct AppState {
    auth: AuthState,
    sync: CloudSync,
    session: Mutex<Option<UserSession>>,
}

#[tauri::command]
async fn login(
    state: State<'_, AppState>,
    username: String,
    password: String,
) -> Result<UserSession, String> {
    let db = state.auth.db.as_ref().ok_or("Database not connected")?;
    let users = db.collection::<mongodb::bson::Document>("users");

    let user = users.find_one(doc! { "username": username.to_lowercase() }, None).await
        .map_err(|e| e.to_string())?
        .ok_or("Tên đăng nhập không tồn tại")?;

    let stored_hash = user.get_str("password_hash").map_err(|e| e.to_string())?;
    
    if verify_password(&password, stored_hash) {
        let session = UserSession {
            username: user.get_str("username").unwrap_or(&username).to_string(),
            email: user.get_str("email").unwrap_or("").to_string(),
            id: user.get_object_id("_id").unwrap_or(ObjectId::new()).to_hex(),
            registered_at: user.get_str("created_at").unwrap_or("").to_string(),
        };
        
        let mut session_guard = state.session.lock().map_err(|_| "Lock error")?;
        *session_guard = Some(session.clone());
        
        Ok(session)
    } else {
        Err("Mật khẩu không chính xác".to_string())
    }
}

#[tauri::command]
async fn register(
    state: State<'_, AppState>,
    username: String,
    email: String,
    password: String,
) -> Result<String, String> {
    let db = state.auth.db.as_ref().ok_or("Database not connected")?;
    let users = db.collection::<mongodb::bson::Document>("users");

    // Check if username exists
    if users.find_one(doc! { "username": username.to_lowercase() }, None).await.map_err(|e| e.to_string())?.is_some() {
        return Err("Tên đăng nhập đã tồn tại".to_string());
    }

    // Check if email exists
    if users.find_one(doc! { "email": email.to_lowercase() }, None).await.map_err(|e| e.to_string())?.is_some() {
        return Err("Email đã tồn tại".to_string());
    }

    let pw_hash = hash_password(&password, None);
    let new_user = doc! {
        "username": username.to_lowercase(),
        "email": email.to_lowercase(),
        "password_hash": pw_hash,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "library": []
    };

    users.insert_one(new_user, None).await.map_err(|e| e.to_string())?;
    Ok("Registration successful".to_string())
}

#[tauri::command]
async fn get_library(state: State<'_, AppState>) -> Result<Vec<GameData>, String> {
    let session = {
        let session_guard = state.session.lock().map_err(|_| "Lock error")?;
        session_guard.as_ref().ok_or("Not logged in")?.clone()
    };
    
    let db = state.auth.db.as_ref().ok_or("Database not connected")?;
    let users = db.collection::<mongodb::bson::Document>("users");
    
    let obj_id = ObjectId::parse_str(&session.id).map_err(|e| e.to_string())?;
    let user = users.find_one(doc! { "_id": obj_id }, None).await
        .map_err(|e| e.to_string())?
        .ok_or("User not found")?;

    let library_bson = user.get_array("library").map_err(|_| "No library items")?;
    let mut games = Vec::new();

    for item in library_bson {
        if let Some(doc) = item.as_document() {
            games.push(GameData {
                gid: doc.get_str("gid").unwrap_or("").to_string(),
                name: doc.get_str("name").unwrap_or("").to_string(),
                exe: doc.get_str("exe").unwrap_or("").to_string(),
                save_dir: doc.get_str("save_dir").unwrap_or("").to_string(),
                zip_name: doc.get_str("zip_name").unwrap_or("").to_string(),
            });
        }
    }

    Ok(games)
}

#[tauri::command]
async fn update_library(state: State<'_, AppState>, games: Vec<GameData>) -> Result<(), String> {
    let session = {
        let session_guard = state.session.lock().map_err(|_| "Lock error")?;
        session_guard.as_ref().ok_or("Not logged in")?.clone()
    };
    
    let db = state.auth.db.as_ref().ok_or("Database not connected")?;
    let users = db.collection::<mongodb::bson::Document>("users");
    
    let obj_id = ObjectId::parse_str(&session.id).map_err(|e| e.to_string())?;
    
    let mut bson_games = Vec::new();
    for g in games {
        bson_games.push(doc! {
            "gid": g.gid,
            "name": g.name,
            "exe": g.exe,
            "save_dir": g.save_dir,
            "zip_name": g.zip_name
        });
    }

    users.update_one(
        doc! { "_id": obj_id },
        doc! { "$set": { "library": bson_games } },
        None
    ).await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn play_game(
    state: State<'_, AppState>,
    exe_path: String,
    save_dir: String,
    zip_name: String,
) -> Result<String, String> {
    // 1. Sync Down if zip exists
    let temp_zip = std::env::temp_dir().join(&zip_name);
    let cloud_key = format!("saves/{}", zip_name); // Simplified for now
    
    if let Err(e) = state.sync.download(&cloud_key, &temp_zip).await {
        println!("Sync down skipped or failed: {}", e);
    } else {
        // Unzip to save_dir
        if let Err(e) = unzip_file(&temp_zip, std::path::Path::new(&save_dir)) {
            println!("Unzip error: {}", e);
        }
    }

    // 2. Launch Game
    let exit_code = launch_and_wait(&exe_path)?;

    // 3. Sync Up
    if exit_code == 0 {
        if let Err(e) = zip_folder(std::path::Path::new(&save_dir), &temp_zip) {
            return Err(format!("Zip error: {}", e));
        }
        state.sync.upload(&temp_zip, &cloud_key).await?;
        Ok("Game finished and saves synced!".to_string())
    } else {
        Ok(format!("Game exited with code {}", exit_code))
    }
}

#[tauri::command]
async fn shell_open(path: String) -> Result<(), String> {
    let path = std::path::Path::new(&path);
    let dir = if path.is_file() {
        path.parent().ok_or("No parent dir")?
    } else {
        path
    };

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .arg(dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tokio::main]
async fn main() {
    let auth = AuthState::new(MONGODB_URI, DB_NAME).await;
    let sync = CloudSync::new(B2_KEY_ID, B2_APP_KEY, B2_ENDPOINT, B2_BUCKET).await;

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            auth,
            sync,
            session: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            login,
            register,
            get_library,
            update_library,
            play_game,
            shell_open
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
