from django.http import HttpResponseForbidden
from django.shortcuts import redirect
from django.urls import reverse

class AdminOnlyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only restrict paths starting with /custom-admin/
        if request.path.startswith('/custom-admin/'):
            if not request.user.is_authenticated:
                return redirect('/?auth=login') # Redirect to home with auth trigger
            if not request.user.is_staff:
                from django.shortcuts import render
                return render(request, 'admin_access_denied.html', status=403)
        
        response = self.get_response(request)
        return response
