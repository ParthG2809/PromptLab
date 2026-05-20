from django.db import models
from django.utils import timezone
import datetime
from django.contrib.auth import get_user_model

User = get_user_model()

class OTPVerification(models.Model):
    PURPOSE_CHOICES = (
        ('register', 'Registration'),
        ('reset', 'Password Reset'),
    )
    
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    purpose = models.CharField(max_length=10, choices=PURPOSE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    
    def is_expired(self):
        # OTP expires in 5 minutes
        return timezone.now() > self.created_at + datetime.timedelta(minutes=5)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} - {self.otp} ({self.purpose})"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    social_links = models.JSONField(default=dict, blank=True)
    theme_color = models.CharField(max_length=20, default='blue')
    
    # Privacy Settings
    hide_activity = models.BooleanField(default=False)
    hide_artworks = models.BooleanField(default=False)
    hide_history = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

class Follow(models.Model):
    follower = models.ForeignKey(User, related_name='following', on_delete=models.CASCADE)
    following = models.ForeignKey(User, related_name='followers', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
