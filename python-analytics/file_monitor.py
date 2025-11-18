"""
File monitor using watchdog for live updates
"""
import time
from pathlib import Path
from typing import Dict, Callable, Set
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent
import threading


class LogFileHandler(FileSystemEventHandler):
    """Handle file system events for log files"""
    
    def __init__(self, callback: Callable[[Path], None]):
        """
        Args:
            callback: Function to call when file is modified
        """
        self.callback = callback
        self.last_modified: Dict[str, float] = {}
        self.debounce_seconds = 1.0  # Prevent duplicate events
    
    def on_modified(self, event):
        """Called when a file is modified"""
        if event.is_directory:
            return
        
        # Only process .txt files
        if not event.src_path.endswith('.txt'):
            return
        
        # Debounce - ignore if modified very recently
        now = time.time()
        last_time = self.last_modified.get(event.src_path, 0)
        
        if now - last_time < self.debounce_seconds:
            return
        
        self.last_modified[event.src_path] = now
        
        # Call callback
        try:
            self.callback(Path(event.src_path))
        except Exception as e:
            print(f"Error in callback for {event.src_path}: {e}")


class FileMonitor:
    """Monitor log directory for changes"""
    
    def __init__(self, log_dir: Path, callback: Callable[[Path], None]):
        """
        Args:
            log_dir: Directory to monitor
            callback: Function to call when file changes
        """
        self.log_dir = log_dir
        self.callback = callback
        self.observer = None
        self.is_running = False
    
    def start(self):
        """Start monitoring"""
        if self.is_running:
            return
        
        print(f"👀 Starting file monitor on {self.log_dir}")
        
        event_handler = LogFileHandler(self.callback)
        self.observer = Observer()
        
        # Watch directory recursively
        self.observer.schedule(event_handler, str(self.log_dir), recursive=True)
        self.observer.start()
        
        self.is_running = True
        print("✅ File monitor started")
    
    def stop(self):
        """Stop monitoring"""
        if not self.is_running:
            return
        
        print("⏹️  Stopping file monitor...")
        
        if self.observer:
            self.observer.stop()
            self.observer.join()
        
        self.is_running = False
        print("✅ File monitor stopped")


class TailReader:
    """Read only new lines from files (tail -f style)"""
    
    def __init__(self):
        """Initialize tail reader"""
        # Track file positions
        self.file_positions: Dict[str, int] = {}
        self.lock = threading.Lock()
    
    def get_new_lines(self, file_path: Path) -> list[str]:
        """
        Get only new lines since last read
        
        Args:
            file_path: Path to file
            
        Returns:
            List of new lines
        """
        file_key = str(file_path)
        new_lines = []
        
        try:
            with self.lock:
                # Get current file size
                if not file_path.exists():
                    return []
                
                file_size = file_path.stat().st_size
                
                # Get last known position
                last_pos = self.file_positions.get(file_key, 0)
                
                # If file was truncated/reset, start from beginning
                if file_size < last_pos:
                    last_pos = 0
                
                # Read from last position
                with open(file_path, 'r', encoding='utf-8') as f:
                    f.seek(last_pos)
                    new_lines = f.readlines()
                    
                    # Update position
                    self.file_positions[file_key] = f.tell()
        
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
        
        return new_lines
    
    def reset_position(self, file_path: Path):
        """Reset position for a file (read from beginning next time)"""
        file_key = str(file_path)
        with self.lock:
            if file_key in self.file_positions:
                del self.file_positions[file_key]
    
    def reset_all(self):
        """Reset all positions"""
        with self.lock:
            self.file_positions.clear()
