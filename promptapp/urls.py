from django.urls import path
from .views import index, generate_prompt, get_usage, save_prompt_api, my_prompts_api, toggle_visibility_api, community_feed_api, delete_prompt_api, interaction_api, comment_api, notifications_api, mark_notifications_read, increment_view_api, report_api, upload_image_api, showcase_feed_api, image_interaction_api, image_comment_api, get_image_details_api, search_prompts_api, prompt_detail_api

urlpatterns = [
    path('', index, name='index'),
    path('generate/', generate_prompt, name='generate_prompt'),
    path('usage/', get_usage, name='get_usage'),
    path('prompts/save/', save_prompt_api, name='save_prompt_api'),
    path('prompts/my/', my_prompts_api, name='my_prompts_api'),
    path('prompts/toggle-visibility/', toggle_visibility_api, name='toggle_visibility_api'),
    path('prompts/delete/', delete_prompt_api, name='delete_prompt_api'),
    path('prompts/community/', community_feed_api, name='community_feed_api'),
    path('prompts/report/', report_api, name='report_api'),
    path('prompts/details/', prompt_detail_api, name='prompt_detail_api'),
    
    # Social URLs
    path('prompts/interact/', interaction_api, name='interaction_api'),
    path('prompts/comments/', comment_api, name='comment_api'),
    path('notifications/', notifications_api, name='notifications_api'),
    path('notifications/read/', mark_notifications_read, name='mark_notifications_read'),
    path('prompts/view/', increment_view_api, name='increment_view_api'),

    # Showcase URLs
    path('showcase/upload/', upload_image_api, name='upload_image_api'),
    path('showcase/feed/', showcase_feed_api, name='showcase_feed_api'),
    path('showcase/interact/', image_interaction_api, name='image_interaction_api'),
    path('showcase/comments/', image_comment_api, name='image_comment_api'),
    path('showcase/details/', get_image_details_api, name='get_image_details_api'),
    path('showcase/search-prompts/', search_prompts_api, name='search_prompts_api'),
]