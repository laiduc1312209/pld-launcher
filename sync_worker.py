"""
PLD Launcher — Cloud Sync Workers (Backblaze B2 Integration)
"""
import os
import shutil
import zipfile

from PySide6.QtCore import QThread, Signal
from cloud_manager import CloudManager
from auth_manager import AuthManager
from settings import get_save_dir, get_zip_name

def get_cloud():
    return CloudManager()


class SyncDownWorker(QThread):
    """Download the latest save archive from Cloud and extract it."""

    status   = Signal(str)
    progress = Signal(int)
    finished = Signal(bool, str)

    def run(self):
        try:
            self.status.emit("Đang kết nối R2 Cloud…")
            self.progress.emit(10)

            auth = AuthManager()
            if not auth.session:
                self.finished.emit(False, "Chưa đăng nhập.")
                return
            
            user_id = auth.session.get("id")
            from settings import load_settings
            active_id = load_settings().get("active_game_id")
            if not active_id:
                self.finished.emit(False, "Chưa chọn game.")
                return

            # R2 Path: saves/user_id/game_id.zip
            cloud_name = f"saves/{user_id}/{active_id}.zip"
            
            self.status.emit("Đang tải dữ liệu…")
            self.progress.emit(30)

            cloud = get_cloud()
            zip_name = get_zip_name()
            success, msg = cloud.download_file(cloud_name, zip_name)
            
            if not success:
                self.progress.emit(100)
                self.finished.emit(True, "Không tìm thấy Save trên Cloud.")
                return

            self.status.emit("Đang giải nén…")
            self.progress.emit(60)

            save_dir = get_save_dir()
            if os.path.exists(save_dir):
                shutil.rmtree(save_dir)
            os.makedirs(save_dir, exist_ok=True)

            with zipfile.ZipFile(zip_name, "r") as z:
                z.extractall(save_dir)

            self.progress.emit(100)
            self.finished.emit(True, "Đã tải save mới nhất từ Cloud")

        except Exception as e:
            self.progress.emit(0)
            self.finished.emit(False, f"Sync-Down lỗi: {e}")


class SyncUpWorker(QThread):
    """Zip save files and upload to Cloud."""

    status   = Signal(str)
    progress = Signal(int)
    finished = Signal(bool, str)

    def run(self):
        try:
            self.status.emit("Đang quét file save…")
            self.progress.emit(10)

            save_dir = get_save_dir()
            save_files = []
            if os.path.exists(save_dir) and os.path.isdir(save_dir):
                for root, _, files in os.walk(save_dir):
                    for fname in files:
                        save_files.append(os.path.join(root, fname))

            if not save_files:
                self.finished.emit(True, "Không tìm thấy file save")
                return

            self.status.emit("Đang nén dữ liệu…")
            self.progress.emit(30)

            zip_name = get_zip_name()
            with zipfile.ZipFile(zip_name, "w", zipfile.ZIP_DEFLATED) as z:
                for fp in save_files:
                    arcname = os.path.relpath(fp, save_dir)
                    z.write(fp, arcname)

            self.progress.emit(60)
            self.status.emit("Đang truyền dữ liệu lên R2…")

            auth = AuthManager()
            user_id = auth.session.get("id")
            from settings import load_settings
            active_id = load_settings().get("active_game_id")
            
            cloud_name = f"saves/{user_id}/{active_id}.zip"
            
            cloud = get_cloud()
            success, msg = cloud.upload_file(zip_name, cloud_name)
            if success:
                self.progress.emit(100)
                self.finished.emit(True, "Đã cập nhật save lên R2 Cloud")
            else:
                self.finished.emit(False, f"Upload lỗi: {msg}")

        except Exception as e:
            self.progress.emit(0)
            self.finished.emit(False, f"Sync-Up lỗi: {e}")

class SyncSettingsWorker(QThread):
    """Uploads local settings.json to Cloud."""
    finished = Signal(bool, str)

    def run(self):
        try:
            auth = AuthManager()
            user_id = auth.session.get("id")
            cloud_name = f"configs/{user_id}/settings.json"

            cloud = get_cloud()
            from settings import SETTINGS_FILE
            if not os.path.exists(SETTINGS_FILE):
                self.finished.emit(False, "Không tìm thấy file settings.")
                return

            success, msg = cloud.upload_file(SETTINGS_FILE, cloud_name)
            if success:
                self.finished.emit(True, "Đã đồng bộ settings lên R2.")
            else:
                self.finished.emit(False, msg)
        except Exception as e:
            self.finished.emit(False, str(e))

class DownloadSettingsWorker(QThread):
    """Downloads settings.json from Cloud to local."""
    finished = Signal(bool, str)

    def run(self):
        try:
            auth = AuthManager()
            user_id = auth.session.get("id")
            cloud_name = f"configs/{user_id}/settings.json"

            cloud = get_cloud()
            from settings import SETTINGS_FILE
            success, msg = cloud.download_file(cloud_name, SETTINGS_FILE)
            if success:
                self.finished.emit(True, "Đã tải danh sách game từ R2.")
            else:
                self.finished.emit(False, f"Dữ liệu R2 trống hoặc lỗi: {msg}")
        except Exception as e:
            self.finished.emit(False, str(e))


