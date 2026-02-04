import os
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Ensure we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services import data_service

def preload_datasets():
    target_count = 5
    dbs = data_service.DB_CATEGORY_MAP
    
    logger.info(f"Targeting {target_count} records per database for {len(dbs)} databases.")
    
    for db_slug, category in dbs.items():
        try:
            # Determine directory for this specific database
            cat_dir = data_service.get_category_dir(category)
            db_dir = os.path.join(cat_dir, db_slug)
            
            # Count existing records (simple heuristic: count .hea or .edf files)
            current_count = 0
            if os.path.exists(db_dir):
                files = [f for f in os.listdir(db_dir) if f.endswith('.hea') or f.endswith('.edf')]
                current_count = len(files)
            
            if current_count < target_count:
                needed = target_count - current_count
                logger.info(f"[{db_slug}] Found {current_count}/{target_count}. Downloading {needed} more...")
                
                # Use the service to download random records
                downloaded = data_service.download_data(
                    db_slug=db_slug, 
                    num_records=needed, 
                    random_shuffle=True,      # Randomize to get a good mix
                    category=category
                )
                logger.info(f"[{db_slug}] Successfully downloaded {len(downloaded)} records.")
            else:
                logger.info(f"[{db_slug}] Already has {current_count} records (>= {target_count}). Skipping.")
                
        except Exception as e:
            logger.error(f"[{db_slug}] Failed to preload: {e}")

if __name__ == "__main__":
    preload_datasets()
