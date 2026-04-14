"""
PLD Launcher — Multi-Game Settings Manager
"""
import os
import json
import uuid

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "settings.json")

_DEFAULTS = {
    "active_game_id": "",
    "games": {}
}

def load_settings() -> dict:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Basic validation to prevent crashes if upgrading from older json format
            if "active_game_id" not in data or "games" not in data:
                return dict(_DEFAULTS)
            return data
        except Exception:
            pass
    return dict(_DEFAULTS)

def save_settings(settings: dict):
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)

def get_games() -> dict:
    return load_settings()["games"]

def get_active_game_id() -> str:
    return load_settings()["active_game_id"]

def set_active_game_id(game_id: str):
    s = load_settings()
    if game_id in s["games"]:
        s["active_game_id"] = game_id
        save_settings(s)

def get_active_game() -> dict:
    s = load_settings()
    gid = s.get("active_game_id")
    return s.get("games", {}).get(gid, {})

def add_update_game(game_id: str, name: str, exe: str, save_dir: str, zip_name: str):
    s = load_settings()
    s["games"][game_id] = {
        "name": name,
        "exe": exe,
        "save_dir": save_dir,
        "zip_name": zip_name
    }
    save_settings(s)

def remove_game(game_id: str):
    s = load_settings()
    if game_id in s["games"]:
        del s["games"][game_id]
        if s["active_game_id"] == game_id:
            s["active_game_id"] = list(s["games"].keys())[0] if s["games"] else ""
        save_settings(s)

def get_game_name() -> str:
    return get_active_game().get("name", "Unknown Game")

def get_game_exe() -> str:
    return get_active_game().get("exe", "")

def set_game_exe(path: str):
    s = load_settings()
    gid = s["active_game_id"]
    if gid in s["games"]:
        s["games"][gid]["exe"] = path
        save_settings(s)

def get_save_dir() -> str:
    path = get_active_game().get("save_dir", "")
    return os.path.expandvars(path) if path else ""

def set_save_dir(path: str):
    s = load_settings()
    gid = s["active_game_id"]
    if gid in s["games"]:
        s["games"][gid]["save_dir"] = path
        save_settings(s)

def get_zip_name() -> str:
    return get_active_game().get("zip_name", "save.zip")
