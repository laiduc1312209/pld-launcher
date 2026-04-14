"""
PLD Launcher — Centralized Configuration
"""
import os

# ─── MongoDB (Auth & Metadata) ───────────────────────────────────
# Thay thế chuỗi <connection_string> bên dưới bằng URI từ MongoDB Atlas của bạn
# Ví dụ: MONGODB_URI = "mongodb+srv://user:pass@cluster.abc.mongodb.net/?retryWrites=true&w=majority"
MONGODB_URI = "mongodb+srv://laiduc1312:duc@cluster0.gg9xrx3.mongodb.net/?appName=Cluster0"
DB_NAME     = "pld_launcher_db"

# ─── App Meta ────────────────────────────────────────────────────
APP_NAME    = "PLD Launcher"
APP_VERSION = "1.3.2"

# ─── GitHub Auto-Update ──────────────────────────────────────────
# Thay bằng repo GitHub của bạn: "username/repo-name"
GITHUB_REPO = "laiduc1312209/PLD-Launcher"

# Backblaze B2 Configuration (High-Speed & No Card Required)
B2_KEY_ID          = "003020e8d4de7630000000001"
B2_APPLICATION_KEY = "K003AUH0j3Lii+ApA9Topt4oxvqEXjk"
B2_BUCKET_NAME     = "pld-launcher-saves"
B2_ENDPOINT        = "s3.eu-central-003.backblazeb2.com" # Thay đổi dựa trên Region của bạn
