import json
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import OTPVerification
from .utils import generate_otp, send_otp_email

User = get_user_model()

@csrf_exempt
def register_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")

        if not all([username, email, password]):
            return JsonResponse({"success": False, "error": "All fields are required."}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({"success": False, "error": "Username already taken."}, status=400)
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({"success": False, "error": "Email already registered."}, status=400)

        # Generate OTP
        otp = generate_otp()
        OTPVerification.objects.create(email=email, otp=otp, purpose='register')
        
        if send_otp_email(email, otp, 'register'):
            # Store temporary data in session to create user after verification
            request.session['temp_user_data'] = {
                'username': username,
                'email': email,
                'password': password
            }
            return JsonResponse({"success": True, "message": "OTP sent to your email."})
        else:
            return JsonResponse({"success": False, "error": "Failed to send OTP. Please try again."}, status=500)

    return JsonResponse({"success": False, "error": "Invalid request."}, status=405)

@csrf_exempt
def verify_otp_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        otp = data.get("otp")
        purpose = data.get("purpose")

        try:
            otp_record = OTPVerification.objects.filter(email=email, otp=otp, purpose=purpose).first()
            
            if not otp_record or otp_record.is_expired():
                return JsonResponse({"success": False, "error": "Invalid or expired OTP."}, status=400)

            if purpose == 'register':
                temp_data = request.session.get('temp_user_data')
                if not temp_data or temp_data['email'] != email:
                    return JsonResponse({"success": False, "error": "Session expired. Please register again."}, status=400)
                
                # Create user
                user = User.objects.create_user(
                    username=temp_data['username'],
                    email=temp_data['email'],
                    password=temp_data['password']
                )
                otp_record.delete()
                del request.session['temp_user_data']
                login(request, user, backend='accounts.backends.EmailOrUsernameBackend')
                return JsonResponse({"success": True, "message": "Account verified and logged in."})
            
            elif purpose == 'reset':
                otp_record.is_verified = True
                otp_record.save()
                return JsonResponse({"success": True, "message": "OTP verified. You can now reset your password."})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    return JsonResponse({"success": False, "error": "Invalid request."}, status=405)

@csrf_exempt
def login_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        identifier = data.get("identifier") # Email or Username
        password = data.get("password")

        user = authenticate(request, username=identifier, password=password)
        if user:
            login(request, user)
            return JsonResponse({
                "success": True, 
                "message": "Login successful.",
                "user": {"username": user.username, "email": user.email, "is_staff": user.is_staff}
            })
        else:
            return JsonResponse({"success": False, "error": "Invalid credentials."}, status=401)

    return JsonResponse({"success": False, "error": "Invalid request."}, status=405)

@csrf_exempt
def forgot_password_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        
        if not User.objects.filter(email=email).exists():
            return JsonResponse({"success": False, "error": "Email not found."}, status=404)

        otp = generate_otp()
        OTPVerification.objects.create(email=email, otp=otp, purpose='reset')
        
        if send_otp_email(email, otp, 'reset'):
            return JsonResponse({"success": True, "message": "Reset OTP sent to your email."})
        else:
            return JsonResponse({"success": False, "error": "Failed to send OTP."}, status=500)

@csrf_exempt
def reset_password_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        new_password = data.get("password")
        otp = data.get("otp")

        otp_record = OTPVerification.objects.filter(email=email, otp=otp, purpose='reset', is_verified=True).first()
        if not otp_record:
            return JsonResponse({"success": False, "error": "Unauthorized reset attempt."}, status=403)

        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        otp_record.delete()
        
        return JsonResponse({"success": True, "message": "Password reset successfully."})

@csrf_exempt
def resend_otp_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        purpose = data.get("purpose")
        
        otp = generate_otp()
        OTPVerification.objects.create(email=email, otp=otp, purpose=purpose)
        
        if send_otp_email(email, otp, purpose):
            return JsonResponse({"success": True, "message": "OTP resent."})
        else:
            return JsonResponse({"success": False, "error": "Failed to resend OTP."})
    return JsonResponse({"success": False, "error": "Invalid request."}, status=405)

from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required
from django.conf import settings
from .models import Profile, Follow
from promptapp.models import Prompt, AIImage
from PIL import Image
import os
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.files.base import ContentFile
from io import BytesIO

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)

def logout_api(request):
    logout(request)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({"success": True, "message": "Logged out."})
    return redirect('/')

def check_auth_api(request):
    if request.user.is_authenticated:
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return JsonResponse({
            "authenticated": True, 
            "username": request.user.username,
            "email": request.user.email,
            "is_staff": request.user.is_staff,
            "avatar": profile.avatar.url if profile.avatar else None
        })
    return JsonResponse({"authenticated": False})

@csrf_exempt
def profile_detail_api(request, username):
    try:
        user = User.objects.get(username__iexact=username)
        profile, _ = Profile.objects.get_or_create(user=user)
        is_owner = request.user.is_authenticated and request.user == user

        # Filter visibility
        prompts_qs = Prompt.objects.filter(user=user, is_private=False)
        if profile.hide_history and not is_owner:
            prompts_qs = prompts_qs.none()
            
        images_qs = AIImage.objects.filter(user=user, is_public=True)
        if profile.hide_artworks and not is_owner:
            images_qs = images_qs.none()

        data = {
            "success": True,
            "profile": {
                "username": user.username,
                "bio": profile.bio,
                "avatar": profile.avatar.url if profile.avatar else None,
                "joined_at": user.date_joined,
                "location": profile.location,
                "website": profile.website,
                "social_links": profile.social_links,
                "theme_color": profile.theme_color,
                "follower_count": user.followers.count(),
                "following_count": user.following.count(),
                "is_following": request.user.is_authenticated and Follow.objects.filter(follower=request.user, following=user).exists()
            },
            "prompts": list(prompts_qs.values('id', 'title', 'category', 'created_at')),
            "artworks": list(images_qs.values('id', 'image', 'title', 'ai_model')),
            "settings": {
                "hide_activity": profile.hide_activity,
                "hide_artworks": profile.hide_artworks,
                "hide_history": profile.hide_history,
                "allow_comments": profile.allow_comments
            } if is_owner else None,
            "is_owner": is_owner
        }
        return JsonResponse(data)
    except User.DoesNotExist:
        return JsonResponse({"success": False, "error": "User not found."}, status=404)

@csrf_exempt
@login_required
def update_profile_api(request):
    if request.method != "POST": return JsonResponse({"success": False, "error": "POST required"}, status=405)
    
    try:
        data = json.loads(request.body)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        
        # Update basic fields
        profile.bio = data.get('bio', profile.bio)
        profile.location = data.get('location', profile.location)
        profile.website = data.get('website', profile.website)
        profile.social_links = data.get('social_links', profile.social_links)
        profile.theme_color = data.get('theme_color', profile.theme_color)
        
        # Privacy settings
        profile.hide_activity = data.get('hide_activity', profile.hide_activity)
        profile.hide_artworks = data.get('hide_artworks', profile.hide_artworks)
        profile.hide_history = data.get('hide_history', profile.hide_history)
        profile.allow_comments = data.get('allow_comments', profile.allow_comments)
        
        profile.save()
        return JsonResponse({"success": True, "message": "Profile updated."})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)

@csrf_exempt
@login_required
def upload_avatar_api(request):
    if request.method != "POST" or not request.FILES.get('avatar'):
        return JsonResponse({"success": False, "error": "Image required"}, status=400)
    
    try:
        img_file = request.FILES['avatar']
        img = Image.open(img_file)
        if img.mode != 'RGB': img = img.convert('RGB')
        
        # Square crop
        width, height = img.size
        min_dim = min(width, height)
        left = (width - min_dim)/2
        top = (height - min_dim)/2
        right = (width + min_dim)/2
        bottom = (height + min_dim)/2
        img = img.crop((left, top, right, bottom))
        
        img.thumbnail((400, 400), Image.LANCZOS)
        
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        
        profile, _ = Profile.objects.get_or_create(user=request.user)
        avatar_name = f'avatar_{request.user.id}.jpg'
        
        # Standard Django way to save to ImageField
        profile.avatar.save(avatar_name, ContentFile(buffer.getvalue()), save=True)
        
        return JsonResponse({"success": True, "avatar_url": profile.avatar.url})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
@login_required
def update_account_api(request):
    if request.method != "POST": return JsonResponse({"success": False, "error": "POST required"}, status=405)
    
    try:
        data = json.loads(request.body)
        password = data.get('current_password')
        if not request.user.check_password(password):
            return JsonResponse({"success": False, "error": "Incorrect password."}, status=403)
            
        new_username = data.get('username')
        new_email = data.get('email')
        new_password = data.get('new_password')
        
        if new_username and new_username != request.user.username:
            if User.objects.filter(username=new_username).exists():
                return JsonResponse({"success": False, "error": "Username taken."}, status=400)
            request.user.username = new_username
            
        if new_email and new_email != request.user.email:
            if User.objects.filter(email=new_email).exists():
                return JsonResponse({"success": False, "error": "Email registered."}, status=400)
            request.user.email = new_email
            
        if new_password:
            request.user.set_password(new_password)
            
        request.user.save()
        if new_password:
            from django.contrib.auth import update_session_auth_hash
            update_session_auth_hash(request, request.user)
        
        return JsonResponse({"success": True, "message": "Account updated."})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)
