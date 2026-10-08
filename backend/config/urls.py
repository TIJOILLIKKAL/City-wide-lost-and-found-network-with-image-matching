from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/auth/", include("apps.authentication.urls")),
    path("api/v1/venues/", include("apps.venues.urls")),
    path("api/v1/items/", include("apps.items.urls")),
    path("api/v1/matching/", include("apps.matching.urls")),
    path("api/v1/claims/", include("apps.claims.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/admin/", include("apps.admin_panel.urls")),
]

if settings.DEBUG:
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
