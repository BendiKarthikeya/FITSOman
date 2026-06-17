"""Mailbox integrations (Gmail OAuth, Outlook OAuth, etc.)."""

from django.contrib.auth.models import User
from django.db import models


class MailboxIntegration(models.Model):
    """A user's connected mailbox (Gmail / Outlook) for sending mail as them."""

    PROVIDER_CHOICES = (
        ("gmail", "Gmail"),
        ("outlook", "Outlook"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mailbox_integrations")
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    email_address = models.EmailField(blank=True)
    display_name = models.CharField(max_length=255, blank=True)
    access_token = models.TextField(blank=True)
    refresh_token = models.TextField(blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    scope = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("user", "provider"),)
        verbose_name = "Mailbox Integration"
        verbose_name_plural = "Mailbox Integrations"

    def __str__(self):
        return f"{self.get_provider_display()} – {self.email_address or self.user.username}"
