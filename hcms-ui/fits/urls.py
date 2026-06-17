"""URL Configuration for the new UI project (recruitment + UI only)."""

import notifications.urls

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path

from recruitment.views.views import careers as careers_view


def health_check(request):
    return JsonResponse({"status": "ok"}, status=200)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("careers/", careers_view, name="careers"),
    path("accounts/", include("django.contrib.auth.urls")),
    path("", include("base.urls")),
    path("", include("fits_views.urls")),
    path("employee/", include("employee.urls")),
    re_path(
        "^inbox/notifications/", include(notifications.urls, namespace="notifications")
    ),
    path("i18n/", include("django.conf.urls.i18n")),
    path("health/", health_check),
    path("recruitment/", include("recruitment.urls")),
    path("ui/", include("ui.urls")),
    path("audit/", include("fits_audit.urls")),
]
