use mongodb::{bson::doc, Client, Database};
use serde::{Deserialize, Serialize};
use hmac::Hmac;
use sha2::Sha256;
use pbkdf2::pbkdf2;
use rand::RngCore;


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSession {
    pub username: String,
    pub email: String,
    pub id: String,
    pub registered_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameData {
    pub gid: String,
    pub name: String,
    pub exe: String,
    pub save_dir: String,
    pub zip_name: String,
}

pub struct AuthState {
    pub _client: Option<Client>,
    pub db: Option<Database>,
}

impl AuthState {
    pub async fn new(uri: &str, db_name: &str) -> Self {
        match Client::with_uri_str(uri).await {
            Ok(client) => {
                let db = client.database(db_name);
                Self {
                    _client: Some(client),
                    db: Some(db),
                }
            }
            Err(e) => {
                println!("MongoDB Connection Error: {}", e);
                Self { _client: None, db: None }
            }
        }
    }
}

pub fn hash_password(password: &str, salt: Option<&str>) -> String {
    let salt_str = match salt {
        Some(s) => s.to_string(),
        None => {
            let mut salt_bytes = [0u8; 16];
            rand::thread_rng().fill_bytes(&mut salt_bytes);
            hex::encode(salt_bytes)
        }
    };

    let iterations = 100_000;
    let mut hash = [0u8; 32];
    let _ = pbkdf2::<Hmac<Sha256>>(
        password.as_bytes(),
        salt_str.as_bytes(),
        iterations,
        &mut hash,
    );

    format!("pbkdf2_sha256${}${}${}", iterations, salt_str, hex::encode(hash))
}

pub fn verify_password(password: &str, stored_hash: &str) -> bool {
    let parts: Vec<&str> = stored_hash.split('$').collect();
    if parts.len() != 4 {
        return false;
    }

    let salt = parts[2];
    let new_hash = hash_password(password, Some(salt));
    new_hash == stored_hash
}
