from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Strict limit on unauthenticated login / register endpoints."""
    scope = "auth"


class SearchRateThrottle(UserRateThrottle):
    """Per-user limit on AI image / text search endpoints (compute-heavy)."""
    scope = "search"
