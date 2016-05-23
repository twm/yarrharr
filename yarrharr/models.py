"""
Placeholder to appease Django's test command
"""

from django.db import models
from yarr.models import Feed


class Label(models.Model):
    """
    Labels may be applied to feeds to group them logically.  Each has a unique
    name.
    """
    text = models.CharField(unique=True, max_length=64)
    user = models.ForeignKey('auth.User')
    feeds = models.ManyToManyField(Feed)

    class Meta:
        unique_together = ('user', 'text')
