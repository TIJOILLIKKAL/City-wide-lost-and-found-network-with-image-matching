import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.core.asgi import get_asgi_application  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from apps.notifications import routing as notifications_routing  # noqa: E402
from apps.chat import routing as chat_routing  # noqa: E402
from core.utils.ws_auth import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": JWTAuthMiddleware(
            URLRouter(
                notifications_routing.websocket_urlpatterns
                + chat_routing.websocket_urlpatterns
            )
        ),
    }
)
