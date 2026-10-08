import logging
from django.http import Http404
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Normalise all API errors to a consistent shape:

        {"detail": "...", "status_code": 404}          # single-message errors
        {"field": ["..."], ..., "status_code": 400}    # validation errors
    """
    # Promote Django's Http404 / PermissionDenied to DRF equivalents so they
    # go through the normal DRF pipeline and respect Accept headers.
    if isinstance(exc, Http404):
        exc = NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = PermissionDenied()

    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception — let Django's 500 machinery deal with it.
        logger.exception("Unhandled exception in %s", context.get("view"))
        return Response(
            {"detail": "A server error occurred.", "status_code": 500},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Ensure the payload is always a dict.
    if not isinstance(response.data, dict):
        response.data = {"detail": response.data}

    # Inject HTTP status so clients can read it from the body too.
    response.data["status_code"] = response.status_code
    return response
