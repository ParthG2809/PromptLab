from django.db import models
from django.contrib.auth import get_user_model
from promptapp.models import Prompt, Comment

User = get_user_model()

class Report(models.Model):
    TYPES = (
        ('PROMPT', 'Prompt'),
        ('COMMENT', 'Comment'),
    )
    STATUS = (
        ('PENDING', 'Pending'),
        ('REVIEWING', 'Reviewing'),
        ('RESOLVED', 'Resolved'),
        ('DISMISSED', 'Dismissed'),
    )
    
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_made')
    target_type = models.CharField(max_length=10, choices=TYPES, default='PROMPT')
    
    # Generic relations or specific ones? I'll use specific ones for simplicity in this Django project.
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS, default='PENDING')
    
    # AI Moderation
    ai_suggestion = models.TextField(blank=True, null=True)
    ai_score = models.FloatField(default=0.0) # 0 to 1, higher means more harmful
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class AuditLog(models.Model):
    admin = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=255)
    target_object_id = models.IntegerField(null=True)
    target_object_type = models.CharField(max_length=100, null=True)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
