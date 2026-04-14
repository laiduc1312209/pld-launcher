"""
PLD Launcher — Game Process Manager
"""
import os
import subprocess

from PySide6.QtCore import QThread, Signal

from settings import get_game_exe


class GameLaunchWorker(QThread):
    """Launch the game in a subprocess and wait for it to exit."""

    started  = Signal()
    finished = Signal(int)  # exit code

    def run(self):
        try:
            game_exe = get_game_exe()
            self.started.emit()
            proc = subprocess.Popen(
                game_exe,
                cwd=os.path.dirname(game_exe),
            )
            exit_code = proc.wait()
            self.finished.emit(exit_code)
        except FileNotFoundError:
            self.finished.emit(-1)
        except Exception:
            self.finished.emit(-2)
