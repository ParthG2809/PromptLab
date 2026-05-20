import time
from django.utils import timezone
from .models import GuestUsage

class GuestUsageMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only track for unregistered users
        if not request.user.is_authenticated:
            # Ensure session exists
            if not request.session.session_key:
                request.session.create()
            
            session_id = request.session.session_key
            ip_address = self.get_client_ip(request)
            
            # Find or create guest usage record
            usage, created = GuestUsage.objects.get_or_create(
                session_id=session_id,
                ip_address=ip_address
            )
            
            # Rate limiting: 10 seconds between requests
            if not created and usage.last_generation:
                time_since_last = (timezone.now() - usage.last_generation).total_seconds()
                if time_since_last < 10:
                    request.rate_limited = True
                else:
                    request.rate_limited = False
            else:
                request.rate_limited = False

            # Attach usage to request for easy access in views
            request.guest_usage = usage
            request.remaining_prompts = max(0, 5 - usage.prompt_count)
            request.limit_reached = usage.prompt_count >= 5
        else:
            request.guest_usage = None
            request.remaining_prompts = 999
            request.limit_reached = False
            request.rate_limited = False

        response = self.get_response(request)
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
