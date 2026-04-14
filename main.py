import sys
import os

# IMPORTANT: Import boto3/botocore BEFORE PySide6 to avoid
# shiboken6 import hook conflict with the 'six' library.
import boto3  # noqa: F401

from PySide6.QtCore import QLockFile, QDir, Qt
from PySide6.QtGui import QFont, QIcon
from PySide6.QtWidgets import QApplication, QMessageBox, QDialog, QVBoxLayout, QLabel, QProgressBar

from qfluentwidgets import setTheme, Theme, setThemeColor, ProgressBar, SubtitleLabel, PrimaryPushButton, InfoBar, InfoBarPosition
from updater import CheckUpdateWorker, DownloadUpdateWorker, apply_update, restart_app

from ui_window import PLDLauncher
from ui_auth import AuthPage
from auth_manager import AuthManager

# Global reference for single-instance lock
_LOCK_FILE = None

class MandatoryUpdateDialog(QDialog):
    """Bảng thông báo bắt buộc cập nhật nếu có bản mới."""
    def __init__(self, version, download_url, changelog, parent=None):
        super().__init__(parent)
        self.download_url = download_url
        self.setWindowTitle("PLD Launcher - Cập nhật bắt buộc")
        self.setFixedSize(400, 250)
        self.setWindowFlags(Qt.WindowType.Window | Qt.WindowType.CustomizeWindowHint | Qt.WindowType.WindowTitleHint)
        self.setStyleSheet("QDialog { background-color: #2d2d2d; color: white; }")
        
        lay = QVBoxLayout(self)
        lay.setContentsMargins(30, 30, 30, 30)
        lay.setSpacing(20)

        title = SubtitleLabel(f"Phiên bản mới: v{version}")
        title.setTextColor("white")
        lay.addWidget(title)

        desc = QLabel(f"Nội dung: {changelog}")
        desc.setWordWrap(True)
        desc.setStyleSheet("color: #bbbbbb;")
        lay.addWidget(desc)

        self.progress = ProgressBar(self)
        self.progress.hide()
        lay.addWidget(self.progress)

        self.status_lbl = QLabel("Vui lòng cập nhật để tiếp tục sử dụng.")
        self.status_lbl.setStyleSheet("color: #bbbbbb;")
        lay.addWidget(self.status_lbl)

        self.btn = PrimaryPushButton("CẬP NHẬT NGAY", self)
        self.btn.clicked.connect(self.start_download)
        lay.addWidget(self.btn)

    def start_download(self):
        self.btn.setEnabled(False)
        self.progress.show()
        self.worker = DownloadUpdateWorker(self.download_url)
        self.worker.progress.connect(self.progress.setValue)
        self.worker.status.connect(self.status_lbl.setText)
        self.worker.finished.connect(self.handle_finished)
        self.worker.start()

    def handle_finished(self, success, path_or_err):
        if success:
            self.status_lbl.setText("Đang khởi động lại...")
            apply_update(path_or_err)
            
            # GIẢI PHÁP: Nhả khóa trước khi khởi động lại
            global _LOCK_FILE
            if _LOCK_FILE:
                _LOCK_FILE.unlock()
                
            restart_app()
        else:
            QMessageBox.critical(self, "Lỗi", f"Không thể cập nhật: {path_or_err}")
            sys.exit(1)


def main():
    # --- Cleanup Old Executable ---
    if getattr(sys, 'frozen', False):
        old_exe = sys.executable + ".old"
        if os.path.exists(old_exe):
            try:
                os.remove(old_exe)
            except Exception:
                pass

    app = QApplication(sys.argv)

    # --- Single Instance Lock ---
    global _LOCK_FILE
    lock_path = os.path.join(QDir.tempPath(), "pld_launcher.lock")
    _LOCK_FILE = QLockFile(lock_path)

    if not _LOCK_FILE.tryLock(100):
        msg = QMessageBox()
        msg.setIcon(QMessageBox.Icon.Warning)
        msg.setWindowTitle("PLD Launcher")
        msg.setText("Ứng dụng đã có một bản đang chạy!")
        msg.setInformativeText("Vui lòng kiểm tra lại khay hệ thống hoặc thanh tác vụ.")
        msg.setStandardButtons(QMessageBox.StandardButton.Ok)
        msg.exec()
        sys.exit(0)

    # --- Fluent Design Theme ---
    setTheme(Theme.DARK)
    setThemeColor('#8b5cf6')  # Violet primary accent

    # Default font
    font = QFont("Segoe UI Variable Display", 10)
    font.setHintingPreference(QFont.HintingPreference.PreferNoHinting)
    app.setFont(font)

    auth_mgr = AuthManager()
    main_window = None

    def launch_actual_app():
        nonlocal main_window
        if not auth_mgr.is_logged_in():
            auth_page = AuthPage()
            auth_page.auth_success.connect(lambda: [auth_page.close(), launch_main_window()])
            auth_page.show()
        else:
            launch_main_window()

    def launch_main_window():
        nonlocal main_window
        main_window = PLDLauncher()
        main_window.show()

    # --- Mandatory Update Check ---
    update_checker = CheckUpdateWorker()

    def on_update_found(ver, url, log):
        dlg = MandatoryUpdateDialog(ver, url, log)
        dlg.exec()

    def on_no_update():
        launch_actual_app()

    def on_error(err):
        # Nếu lỗi mạng, có thể cho qua hoặc bắt buộc dừng tùy ý bạn.
        # Ở đây mình cho qua để người dùng vẫn vào được nếu offline.
        launch_actual_app()

    update_checker.update_available.connect(on_update_found)
    update_checker.no_update.connect(on_no_update)
    update_checker.error.connect(on_error)
    
    # Bắt đầu kiểm tra update ngầm ngay khi app bật
    update_checker.start()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()