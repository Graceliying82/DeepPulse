import sqlite3
import os
from typing import List, Dict, Optional

# Database path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DB_PATH = os.path.join(BASE_DIR, 'backend', 'data', 'local_inventory.db')

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    # Create records table if not exists
    c.execute('''
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            database TEXT NOT NULL,
            record_name TEXT NOT NULL,
            status TEXT DEFAULT 'available', -- 'available', 'downloaded'
            path TEXT,
            meta_info TEXT, -- JSON string for extra comments
            UNIQUE(database, record_name)
        )
    ''')
    conn.commit()
    conn.close()

# Initialize on module load check? or explicit call? 
# We'll explicitly call it when needed or at app startup.
init_db()

def add_or_update_records(database: str, record_names: List[str]):
    """Batch insert/ignore online records."""
    conn = get_db_connection()
    c = conn.cursor()
    # We only insert if not exists. We don't overwrite status 'downloaded' with 'available'.
    # So we use INSERT OR IGNORE.
    
    data = [(database, name) for name in record_names]
    c.executemany("INSERT OR IGNORE INTO records (database, record_name) VALUES (?, ?)", data)
    
    conn.commit()
    conn.close()

def mark_record_downloaded(database: str, record_name: str, local_path: str):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        UPDATE records 
        SET status = 'downloaded', path = ? 
        WHERE database = ? AND record_name = ?
    ''', (local_path, database, record_name))
    
    # If it didn't exist (edge case), insert it
    if c.rowcount == 0:
        c.execute('''
            INSERT INTO records (database, record_name, status, path)
            VALUES (?, ?, 'downloaded', ?)
        ''', (database, record_name, local_path))
        
    conn.commit()
    conn.close()

def get_inventory(database: str) -> List[Dict]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM records WHERE database = ? ORDER BY record_name", (database,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_all_downloaded() -> List[Dict]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM records WHERE status = 'downloaded' ORDER BY database, record_name")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
