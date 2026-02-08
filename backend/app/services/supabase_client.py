"""
Thin wrapper around the Supabase Python SDK.
All backend code imports get_client() from here.
"""

import os
from supabase import create_client, Client

_client: Client | None = None


def get_client() -> Client:
    """Return a cached Supabase client (created once per process)."""
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set."
            )
        _client = create_client(url, key)
    return _client
