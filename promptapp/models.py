from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class GuestUsage(models.Model):
    # ... (existing GuestUsage)
    session_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(db_index=True)
    prompt_count = models.IntegerField(default=0)
    last_generation = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Guest Usage"
        verbose_name_plural = "Guest Usages"
        unique_together = ('session_id', 'ip_address')

    def __str__(self):
        return f"{self.ip_address} - {self.prompt_count} prompts"

class Prompt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prompts')
    title = models.CharField(max_length=255)
    idea = models.TextField()
    content = models.TextField() # Encrypted if is_private is True
    is_private = models.BooleanField(default=True)
    uploaded_image = models.ImageField(upload_to='uploaded_prompts/%Y/%m/%d/', null=True, blank=True)
    
    prompt_type = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    sub_style = models.CharField(max_length=100, default="N/A")
    format_type = models.CharField(max_length=50)
    
    # Social Stats
    view_count = models.PositiveIntegerField(default=0)
    tags = models.CharField(max_length=255, blank=True, help_text="Comma separated tags")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} by {self.user.username}"

    @property
    def likes_count(self):
        return self.interactions.filter(type='LIKE').count()

    @property
    def dislikes_count(self):
        return self.interactions.filter(type='DISLIKE').count()

class Interaction(models.Model):
    INTERACTION_TYPES = (
        ('LIKE', 'Like'),
        ('DISLIKE', 'Dislike'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name='interactions')
    type = models.CharField(max_length=10, choices=INTERACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'prompt')

class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField()
    is_moderated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def likes_count(self):
        return self.comment_interactions.filter(type='LIKE').count()

    @property
    def dislikes_count(self):
        return self.comment_interactions.filter(type='DISLIKE').count()

    class Meta:
        ordering = ['created_at']

class CommentInteraction(models.Model):
    INTERACTION_TYPES = (
        ('LIKE', 'Like'),
        ('DISLIKE', 'Dislike'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='comment_interactions')
    type = models.CharField(max_length=10, choices=INTERACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'comment')

class Notification(models.Model):
    TYPES = (
        ('LIKE', 'liked your prompt'),
        ('DISLIKE', 'disliked your prompt'),
        ('COMMENT', 'commented on your prompt'),
        ('REPLY', 'replied to your comment'),
        ('MENTION', 'mentioned you in a comment'),
        ('IMAGE_LIKE', 'liked your image'),
        ('IMAGE_COMMENT', 'commented on your image'),
        ('SYSTEM', 'System notification'),
    )
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, null=True, blank=True)
    ai_image = models.ForeignKey('AIImage', on_delete=models.CASCADE, null=True, blank=True)
    type = models.CharField(max_length=20, choices=TYPES)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class AIImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_images')
    prompt = models.ForeignKey(Prompt, on_delete=models.SET_NULL, null=True, blank=True, related_name='generated_images')
    image = models.ImageField(upload_to='showcase/%Y/%m/%d/')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Metadata
    ai_model = models.CharField(max_length=100, default="Unknown AI")
    tags = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=100, blank=True)
    
    inspired_by = models.CharField(max_length=255, blank=True, help_text="Manual creator mentions or external links")
    
    # Stats
    view_count = models.PositiveIntegerField(default=0)
    is_public = models.BooleanField(default=True)
    is_moderated = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def likes_count(self):
        return self.image_interactions.filter(type='LIKE').count()

class ImageInteraction(models.Model):
    INTERACTION_TYPES = (('LIKE', 'Like'), ('DISLIKE', 'Dislike'))
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ForeignKey(AIImage, on_delete=models.CASCADE, related_name='image_interactions')
    type = models.CharField(max_length=10, choices=INTERACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'image')

class ImageComment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ForeignKey(AIImage, on_delete=models.CASCADE, related_name='image_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
