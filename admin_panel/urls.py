from django.urls import path
from .views import admin_dashboard, admin_stats_api, public_prompts_api, manage_reports_api, moderate_content_api, manage_users_api, public_images_api

urlpatterns = [
    path('', admin_dashboard, name='admin_dashboard'),
    path('api/stats/', admin_stats_api, name='admin_stats_api'),
    path('api/reports/', manage_reports_api, name='manage_reports_api'),
    path('api/moderate/', moderate_content_api, name='moderate_content_api'),
    path('api/prompts/', public_prompts_api, name='public_prompts_api'),
    path('api/images/', public_images_api, name='public_images_api'),
    path('api/users/', manage_users_api, name='manage_users_api'),
]
