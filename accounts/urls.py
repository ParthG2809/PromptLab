from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register_api, name='register_api'),
    path('verify-otp/', views.verify_otp_api, name='verify_otp_api'),
    path('login/', views.login_api, name='login_api'),
    path('logout/', views.logout_api, name='logout_api'),
    path('forgot-password/', views.forgot_password_api, name='forgot_password_api'),
    path('reset-password/', views.reset_password_api, name='reset_password_api'),
    path('resend-otp/', views.resend_otp_api, name='resend_otp_api'),
    path('check-auth/', views.check_auth_api, name='check_auth_api'),
    path('profile/update/', views.update_profile_api, name='update_profile_api'),
    path('profile/avatar/', views.upload_avatar_api, name='upload_avatar_api'),
    path('profile/<str:username>/', views.profile_detail_api, name='profile_detail_api'),
    path('account/update/', views.update_account_api, name='update_account_api'),
]
