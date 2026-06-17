from .settings import *

DEBUG = True

# Enable query logging to see slow queries
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG",  # Log all SQL queries
            "propagate": False,
        },
    },
}

# Use in-memory cache in development
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "fits-dev-cache",
        "TIMEOUT": 300,
        "OPTIONS": {"MAX_ENTRIES": 10000},
    }
}

# Email (Brevo SMTP) — loaded from .env
import os
EMAIL_BACKEND = "base.backends.ConfiguredEmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp-relay.brevo.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True") == "True"
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "contractor1@fits.one")

# Gmail OAuth (Profile -> Integrations -> Connect Gmail)
GMAIL_CLIENT_ID = os.environ.get("GMAIL_CLIENT_ID", "")
GMAIL_CLIENT_SECRET = os.environ.get("GMAIL_CLIENT_SECRET", "")
GMAIL_REDIRECT_URI = os.environ.get(
    "GMAIL_REDIRECT_URI",
    "http://127.0.0.1:8000/integrations/gmail/callback/",
)

# HTTP in dev — allow session cookie over non-HTTPS
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
