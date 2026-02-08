"""
Database service -- queries Supabase PostgreSQL for record/database metadata.
Replaces the old SQLite-based inventory.
"""

import logging
from typing import List, Dict, Optional

from app.services.supabase_client import get_client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Database (PhysioNet source) queries
# ---------------------------------------------------------------------------

def list_databases() -> List[Dict]:
    """Return all databases."""
    resp = get_client().table("databases").select("*").execute()
    return resp.data


def get_database(slug: str) -> Optional[Dict]:
    """Return a single database by slug."""
    resp = (
        get_client()
        .table("databases")
        .select("*")
        .eq("slug", slug)
        .maybe_single()
        .execute()
    )
    return resp.data


def list_databases_by_category(category: str) -> List[Dict]:
    """Return databases that belong to a category."""
    resp = (
        get_client()
        .table("databases")
        .select("*")
        .eq("category", category)
        .execute()
    )
    return resp.data


# ---------------------------------------------------------------------------
# Record queries
# ---------------------------------------------------------------------------

def get_inventory(db_slug: str) -> List[Dict]:
    """Return all records for a given database slug."""
    resp = (
        get_client()
        .table("records")
        .select("*")
        .eq("database_slug", db_slug)
        .order("record_name")
        .execute()
    )
    return resp.data


def get_record(db_slug: str, record_name: str) -> Optional[Dict]:
    """Return a single record row."""
    resp = (
        get_client()
        .table("records")
        .select("*")
        .eq("database_slug", db_slug)
        .eq("record_name", record_name)
        .maybe_single()
        .execute()
    )
    return resp.data


def get_records_by_category(category: str) -> List[Dict]:
    """Return all records whose database belongs to a category."""
    # Get database slugs for this category first
    dbs = list_databases_by_category(category)
    if not dbs:
        return []

    slugs = [db["slug"] for db in dbs]
    resp = (
        get_client()
        .table("records")
        .select("*")
        .in_("database_slug", slugs)
        .order("record_name")
        .execute()
    )
    return resp.data
