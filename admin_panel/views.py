from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.contrib.admin.views.decorators import staff_member_required
from django.views.decorators.csrf import csrf_exempt
from promptapp.models import Prompt, Comment, AIImage
from .models import Report, AuditLog
import json
from django.utils.text import slugify

User = get_user_model()

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

@staff_member_required
def admin_dashboard(request):
    return render(request, 'admin_dashboard.html')

@staff_member_required
def admin_stats_api(request):
    total_users = User.objects.count()
    total_public_prompts = Prompt.objects.filter(is_private=False).count()
    total_public_images = AIImage.objects.filter(is_public=True).count()
    pending_reports = Report.objects.filter(status='PENDING').count()
    
    recent_logs = AuditLog.objects.all()[:15]
    logs_data = [{
        "admin": log.admin.username,
        "action": log.action,
        "details": log.details,
        "time": log.created_at.strftime("%H:%M, %d %b")
    } for log in recent_logs]
    
    return JsonResponse({
        "success": True,
        "stats": {
            "users": total_users,
            "public_prompts": total_public_prompts,
            "public_images": total_public_images,
            "reports": pending_reports
        },
        "recent_activity": logs_data
    })

@csrf_exempt
@staff_member_required
def manage_reports_api(request):
    if request.method == "GET":
        reports = Report.objects.filter(status__in=['PENDING', 'REVIEWING']).order_by('-created_at')
        data = []
        for r in reports:
            target_data = {}
            if r.target_type == "PROMPT":
                target_data = {
                    "id": r.prompt.id,
                    "title": r.prompt.title,
                    "content": r.prompt.content,
                    "creator": r.prompt.user.username
                }
            elif r.target_type == "AI_IMAGE":
                target_data = {
                    "id": r.ai_image.id,
                    "title": r.ai_image.title,
                    "url": r.ai_image.image.url,
                    "creator": r.ai_image.user.username
                }
            else:
                target_data = {
                    "id": r.comment.id,
                    "content": r.comment.content,
                    "creator": r.comment.user.username,
                    "prompt_title": r.comment.prompt.title
                }
            
            data.append({
                "id": r.id,
                "type": r.target_type,
                "reporter": r.reporter.username,
                "reason": r.reason,
                "status": r.status,
                "target": target_data,
                "ai_suggestion": r.ai_suggestion,
                "ai_score": r.ai_score,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M")
            })
        return JsonResponse({"success": True, "reports": data})

    if request.method == "POST":
        data = json.loads(request.body)
        report_id = data.get("report_id")
        action = data.get("action") # DISMISS, RESOLVE
        
        report = Report.objects.get(id=report_id)
        report.status = "DISMISSED" if action == "DISMISS" else "RESOLVED"
        report.save()
        
        AuditLog.objects.create(
            admin=request.user,
            action=f"Report {action}",
            target_object_id=report_id,
            target_object_type="Report",
            details=f"Status set to {report.status}",
            ip_address=get_client_ip(request)
        )
        return JsonResponse({"success": True})

@csrf_exempt
@staff_member_required
def moderate_content_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        target_type = data.get("target_type") # PROMPT, COMMENT
        target_id = data.get("target_id")
        action = data.get("action") # DELETE, FORCE_PRIVATE
        
        if target_type == "PROMPT":
            target = Prompt.objects.get(id=target_id, is_private=False)
            if action == "DELETE":
                target.delete()
            elif action == "FORCE_PRIVATE":
                target.is_private = True
                target.save()
            target = Comment.objects.get(id=target_id)
            if action == "DELETE":
                target.delete()
        elif target_type == "AI_IMAGE":
            target = AIImage.objects.get(id=target_id)
            if action == "DELETE":
                target.delete()
            elif action == "HIDE":
                target.is_public = False
                target.save()
        
        AuditLog.objects.create(
            admin=request.user,
            action=f"Moderate {target_type}",
            target_object_id=target_id,
            target_object_type=target_type,
            details=f"Performed action: {action}",
            ip_address=get_client_ip(request)
        )
        return JsonResponse({"success": True})

@staff_member_required
def public_prompts_api(request):
    """View public prompts only."""
    prompts = Prompt.objects.filter(is_private=False).order_by('-created_at')
    data = [{
        "id": p.id,
        "title": p.title,
        "creator": p.user.username,
        "category": p.category,
        "created": p.created_at.strftime("%Y-%m-%d")
    } for p in prompts]
    return JsonResponse({"success": True, "prompts": data})

@csrf_exempt
@staff_member_required
def manage_users_api(request):
    if request.method == "GET":
        users = User.objects.all().order_by('-date_joined')
        data = [{
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_active": u.is_active,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "joined": u.date_joined.strftime("%Y-%m-%d")
        } for u in users]
        return JsonResponse({"success": True, "users": data})

    if request.method == "POST":
        data = json.loads(request.body)
        action = data.get("action")
        
        if action == "CREATE":
            username = data.get("username")
            email = data.get("email")
            password = data.get("password")
            
            if User.objects.filter(username=username).exists():
                return JsonResponse({"success": False, "error": "Username already exists."}, status=400)
            
            new_user = User.objects.create_user(username=username, email=email, password=password)
            AuditLog.objects.create(
                admin=request.user,
                action="Create User",
                target_object_id=new_user.id,
                target_object_type="User",
                details=f"Created user: {username}",
                ip_address=get_client_ip(request)
            )
            return JsonResponse({"success": True})

        user_id = data.get("user_id")
        target_user = User.objects.get(id=user_id)
        
        if action == "TOGGLE_ACTIVE":
            target_user.is_active = not target_user.is_active
            msg = f"Status set to {'Active' if target_user.is_active else 'Inactive'}"
        elif action == "TOGGLE_STAFF":
            target_user.is_staff = not target_user.is_staff
            msg = f"Staff status set to {target_user.is_staff}"
        elif action == "TOGGLE_SUPERUSER":
            if not request.user.is_superuser:
                return JsonResponse({"success": False, "error": "Only superusers can grant superuser status."}, status=403)
            target_user.is_superuser = not target_user.is_superuser
            msg = f"Superuser status set to {target_user.is_superuser}"
        elif action == "DELETE":
            target_user.delete()
            msg = "User deleted permanently"
        
        if action != "DELETE":
            target_user.save()
            
        AuditLog.objects.create(
            admin=request.user,
            action=f"User {action}",
            target_object_id=user_id,
            target_object_type="User",
            details=msg,
            ip_address=get_client_ip(request)
        )
        return JsonResponse({"success": True})

@staff_member_required
def public_images_api(request):
    images = AIImage.objects.filter(is_public=True).order_by('-created_at')
    data = [{
        "id": img.id,
        "title": img.title,
        "url": img.image.url,
        "creator": img.user.username,
        "model": img.ai_model,
        "created": img.created_at.strftime("%Y-%m-%d")
    } for img in images]
    return JsonResponse({"success": True, "images": data})

