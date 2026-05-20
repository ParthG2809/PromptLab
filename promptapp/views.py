import os
import json
from django.db import models
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.paginator import Paginator
from django.contrib.auth.models import User
from .models import Prompt, Interaction, Comment, CommentInteraction, Notification, AIImage, ImageInteraction, ImageComment
from dotenv import load_dotenv

from google import genai   # ✅ NEW SDK
from google.genai import types # ✅ NEW SDK TYPES

# Load environment variables
load_dotenv()

# Initialize API Clients
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ✅ Helper function to call specific AI models
def call_specific_model(model_name, prompt):
    """
    Tries to call the specified model. Returns the text response if successful.
    """
    try:
        if model_name == "gemini":
            print("Attempting Gemini...")
            # Use safety settings to prevent Anime/Fantasy/Sci-Fi from being blocked
            safe_config = types.GenerateContentConfig(
                safety_settings=[
                    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                ]
            )

            gemini_fallback_models = [
                "gemini-flash-latest",
                "gemini-1.5-flash",
                "gemini-pro-latest",
                "gemini-2.0-flash",
                "gemini-2.5-flash"
            ]

            for g_model in gemini_fallback_models:
                try:
                    response = gemini_client.models.generate_content(
                        model=g_model,
                        contents=prompt,
                        config=safe_config
                    )
                    return response.text
                except Exception as e:
                    print(f"DEBUG: {g_model} unavailable: {e}")

            # If it exhausts the list, return None
            return None

    except Exception as e:
        print(f"DEBUG: Final error for {model_name}: {str(e)}")
        return None


from django.conf import settings

def cleanup_temp_files():
    """
    Deletes files older than 1 hour in MEDIA_ROOT/temp_prompts
    """
    try:
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_prompts')
        if os.path.exists(temp_dir):
            import time
            now = time.time()
            for f in os.listdir(temp_dir):
                f_path = os.path.join(temp_dir, f)
                if os.path.isfile(f_path):
                    if os.stat(f_path).st_mtime < now - 3600:
                        os.remove(f_path)
    except Exception as e:
        print(f"Error during temp cleanup: {e}")

def call_multimodal_model(image_path, user_instruction):
    """
    Calls Gemini model with an image input and text instruction.
    """
    try:
        from PIL import Image
        img = Image.open(image_path)
        
        # Convert image to RGB if it's RGBA/LA (Pillow raises error for some formats)
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            img = img.convert('RGB')
            
        safe_config = types.GenerateContentConfig(
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
            ]
        )
        
        models_to_try = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ]
        
        for model in models_to_try:
            try:
                response = gemini_client.models.generate_content(
                    model=model,
                    contents=[img, user_instruction],
                    config=safe_config
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                print(f"DEBUG Multimodal: {model} failed: {e}")
                
        return None
    except Exception as e:
        print(f"DEBUG Multimodal: General error: {e}")
        return None

# ✅ FRONTEND VIEW
def index(request):
    return render(request, 'index.html')


# ✅ API VIEW
@csrf_exempt
def generate_prompt(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Only POST method allowed"}, status=405)
        
    try:
        # Check limit
        if hasattr(request, 'limit_reached') and request.limit_reached:
            return JsonResponse({
                "success": False,
                "error": "Limit reached",
                "limit_reached": True,
                "remaining": 0
            }, status=403)
        
        # Check rate limit
        if hasattr(request, 'rate_limited') and request.rate_limited:
            return JsonResponse({
                "success": False,
                "error": "Too many requests. Please wait 10 seconds."
            }, status=429)

        # Detect multipart form (Image to Prompt) or standard JSON request
        is_multipart = request.FILES or request.POST.get("promptType") == "Image to Prompt"
        
        if is_multipart:
            prompt_type = request.POST.get("promptType")
            format_type = request.POST.get("format")
            image_file = request.FILES.get("image")
            
            if not image_file:
                return JsonResponse({"success": False, "error": "Image file is required for Image to Prompt analysis."}, status=400)
            
            cleanup_temp_files()
            
            import uuid
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_prompts')
            os.makedirs(temp_dir, exist_ok=True)
            
            ext = os.path.splitext(image_file.name)[1]
            temp_filename = f"{uuid.uuid4()}{ext}"
            temp_path = os.path.join(temp_dir, temp_filename)
            
            with open(temp_path, 'wb+') as destination:
                for chunk in image_file.chunks():
                    destination.write(chunk)
            
            format_instructions = {
                "Midjourney Prompt": "Analyze the image and generate a highly detailed and expressive Midjourney prompt. Describe subject, composition, camera angles, lighting, style, rendering engines (e.g., v6.0), and append appropriate aspect ratio parameters or styling suffixes if needed.",
                "Flux Prompt": "Analyze the image and write a detailed, highly descriptive prompt optimized for the Flux image generation model. Detail textures, natural lighting, precise positioning of elements, and raw hyperreal details.",
                "Stable Diffusion Prompt": "Analyze the image and generate a detailed Stable Diffusion XL (SDXL) prompt. Include descriptive tag-based and descriptive phrase modifiers, stylistic keywords, high resolution quality tags (e.g., hyperrealistic, masterwork, 8k), and avoid negative traits.",
                "Cinematic Gaming Prompt": "Analyze the image and generate a cinematic gaming style prompt. Focus on dramatic lighting, Unreal Engine 5 render details, ray tracing, cinematic color grading, atmosphere (fog, dust, embers), and high epic fantasy or sci-fi aesthetic.",
                "Anime Prompt": "Analyze the image and generate an anime style prompt. Describe features in modern anime aesthetics (e.g., Makoto Shinkai or Studio Ghibli inspired), line art details, vibrant coloring, scenic background, cell shading, and soft dramatic focus.",
                "Realistic Photography Prompt": "Analyze the image and generate a photorealistic camera prompt. Detail exact lens types (e.g., 85mm f/1.4), film stock, shutter speeds, exact lighting conditions (e.g., golden hour, rim light), and composition (e.g., rule of thirds, depth of field).",
                "Product Photography Prompt": "Analyze the image and generate a professional studio product photography prompt. Focus on clean product lighting (e.g., softbox, key light), clean minimalist backdrop, high detail reflections, commercial catalog grade styling, and crisp product isolation.",
                "Fantasy Art Prompt": "Analyze the image and generate an epic fantasy art style prompt. Emphasize magical elements, ethereal lighting, painterly textures (oil/watercolor blend), mythological motifs, grand scales, and intricate artistic details.",
                "UI/UX Design Prompt": "Analyze the image and generate a clean UI/UX layout prompt. Describe layout structure, typography, modern dark/light glassmorphic UI elements, interactive features, user interface clean components, dashboard design elements.",
                "Character Design Prompt": "Analyze the image and generate a character design concept sheet prompt. Focus on character features, outfit details, weapon or gear, pose, expressions, turn-around concept sheet layout, and clean background.",
                "Environment Concept Prompt": "Analyze the image and generate an environment concept art prompt. Describe the grand landscape, architectural structure, atmospheric depth, epic mood, scale, time of day, weather, and worldbuilding lore detail."
            }
            
            instruction = format_instructions.get(format_type, "Analyze this image and describe it to generate an AI art prompt.")
            
            full_prompt = f"""
You are an expert AI prompt engineer.
Analyze the provided image in detail and create a stunning generation prompt.

Format Request: {format_type}
Instruction: {instruction}

Write ONLY the final prompt text. Do not include any intros, titles, or conversational words.
"""
            output = call_multimodal_model(temp_path, full_prompt)
            used_model = "gemini-multimodal"
            temp_image_url = f"{settings.MEDIA_URL}temp_prompts/{temp_filename}"
        else:
            data = json.loads(request.body)
            idea = data.get("idea")
            format_type = data.get("format")
            category = data.get("category")
            sub_style = data.get("subStyle")
            prompt_type = data.get("promptType")
            sub_prompt_type = data.get("subPromptType")
            preferred_model = data.get("model", "gemini")
            
            if format_type == "natural":
                instruction = "Generate a detailed natural language prompt."
            elif format_type == "keywords":
                instruction = "Generate a comma-separated keyword prompt."
            elif format_type == "json":
                instruction = "Generate a structured JSON prompt."
            else:
                instruction = "Generate an image-to-image prompt with reference suggestion."

            full_prompt = f"""
You are an expert AI prompt engineer.

Prompt Type: {prompt_type}
Subcategory: {sub_prompt_type}

{instruction}

Style Category: {category}
Sub Style: {sub_style}

User Idea: {idea}
"""
            models_to_try = ["gemini"]
            output = None
            used_model = None

            for model in models_to_try:
                output = call_specific_model(model, full_prompt)
                if output:
                    used_model = model
                    break
            
            temp_image_url = None

        if output:
            if hasattr(request, 'guest_usage') and request.guest_usage:
                request.guest_usage.prompt_count += 1
                request.guest_usage.save()
                remaining = max(0, 5 - request.guest_usage.prompt_count)
            else:
                remaining = 999

            return JsonResponse({
                "success": True,
                "output": output.strip(),
                "model_used": used_model,
                "remaining": remaining,
                "temp_image_url": temp_image_url,
                "limit_reached": remaining <= 0 if remaining != 999 else False
            })
        else:
            return JsonResponse({
                "success": False,
                "error": "All AI models are currently busy or unavailable. Please check your API keys."
            })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        })

from .models import Prompt, Interaction, Comment, Notification, CommentInteraction
from .encryption import prompt_encryption

@csrf_exempt
def save_prompt_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Login required to save prompts."}, status=401)
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            is_private = data.get("is_private", True)
            content = data.get("content")
            temp_image_url = data.get("temp_image_url")
            
            # For Image to Prompt, we force privacy
            if data.get("prompt_type") == "Image to Prompt":
                is_private = True
            
            # Encrypt if private
            if is_private:
                content = prompt_encryption.encrypt(content)
            
            uploaded_image_file = None
            if temp_image_url:
                filename = os.path.basename(temp_image_url)
                temp_path = os.path.join(settings.MEDIA_ROOT, 'temp_prompts', filename)
                if os.path.exists(temp_path):
                    from django.core.files.base import ContentFile
                    with open(temp_path, 'rb') as f:
                        uploaded_image_file = ContentFile(f.read(), name=filename)
            
            Prompt.objects.create(
                user=request.user,
                title=data.get("title", "Untitled Prompt"),
                idea=data.get("idea", ""),
                content=content,
                is_private=is_private,
                prompt_type=data.get("prompt_type", "General"),
                category=data.get("category", "General"),
                sub_style=data.get("sub_style", "N/A"),
                format_type=data.get("format_type", "natural"),
                uploaded_image=uploaded_image_file
            )
            return JsonResponse({"success": True, "message": "Prompt saved successfully."})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
    return JsonResponse({"success": False, "error": "Only POST allowed."}, status=405)


def my_prompts_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Login required."}, status=401)
    
    query = request.GET.get('q', '')
    sort_by = request.GET.get('sort', '-created_at')
    
    prompts = Prompt.objects.filter(user=request.user)
    if query:
        prompts = prompts.filter(title__icontains=query) | prompts.filter(idea__icontains=query)
    
    prompts = prompts.order_by(sort_by)
    
    data = []
    for p in prompts:
        content = p.content
        if p.is_private:
            content = prompt_encryption.decrypt(content)
            if content is None:
                content = "[Decryption Error: Invalid Encryption Key]"
            
        data.append({
            "id": p.id,
            "title": p.title,
            "idea": p.idea,
            "content": content,
            "is_private": p.is_private,
            "category": p.category,
            "prompt_type": p.prompt_type,
            "creator": p.user.username,
            "likes": p.likes_count,
            "dislikes": p.dislikes_count,
            "views": p.view_count,
            "comments_count": p.comments.count(),
            "uploaded_image": p.uploaded_image.url if p.uploaded_image else None,
            "created_at": p.created_at.strftime("%Y-%m-%d %H:%M")
        })
    
    return JsonResponse({"success": True, "prompts": data})

@csrf_exempt
def toggle_visibility_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Login required."}, status=401)
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            prompt_id = data.get("prompt_id")
            prompt = Prompt.objects.get(id=prompt_id, user=request.user)
            
            # Toggle logic
            new_visibility = not prompt.is_private
            content = prompt.content
            
            if new_visibility: # Changing from Public to Private
                # Prompt is currently Public (plain text), just encrypt it
                content = prompt_encryption.encrypt(content)
            else: # Changing from Private to Public
                # Prompt is currently Private (encrypted), must decrypt it
                decrypted = prompt_encryption.decrypt(content)
                if decrypted is None:
                    return JsonResponse({"success": False, "error": "Decryption failed. Could not read private data."}, status=500)
                content = decrypted
            
            prompt.is_private = new_visibility
            prompt.content = content
            prompt.save()
            
            return JsonResponse({
                "success": True, 
                "is_private": prompt.is_private,
                "message": f"Prompt is now {'Private' if prompt.is_private else 'Public'}."
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
    return JsonResponse({"success": False, "error": "Invalid request."}, status=405)

@csrf_exempt
def delete_prompt_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Login required."}, status=401)
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            prompt_id = data.get("prompt_id")
            prompt = Prompt.objects.get(id=prompt_id, user=request.user)
            prompt.delete()
            return JsonResponse({"success": True, "message": "Prompt deleted successfully."})
        except Prompt.DoesNotExist:
            return JsonResponse({"success": False, "error": "Prompt not found or unauthorized."}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
    return JsonResponse({"success": False, "error": "Invalid request."}, status=405)

def community_feed_api(request):
    """List all public prompts for the community with pagination and social stats."""
    query = request.GET.get('q', '')
    category = request.GET.get('category', '')
    sort = request.GET.get('sort', 'latest') # 'latest' or 'trending'
    page = int(request.GET.get('page', 1))
    limit = 12
    
    prompts = Prompt.objects.filter(is_private=False)
    
    if query:
        prompts = prompts.filter(Q(title__icontains=query) | Q(idea__icontains=query) | Q(tags__icontains=query))
        
    if sort == 'trending':
        # Simple trending logic: view_count + (likes * 2)
        prompts = prompts.annotate(
            score=models.F('view_count') + (models.Count('interactions', filter=models.Q(interactions__type='LIKE')) * 2)
        ).order_by('-score', '-created_at')
    else:
        prompts = prompts.order_by('-created_at')
    
    # Pagination
    total = prompts.count()
    start = (page - 1) * limit
    end = start + limit
    prompts_page = prompts[start:end]
    
    data = []
    for p in prompts_page:
        # Check if current user liked/disliked
        has_liked = False
        has_disliked = False
        if request.user.is_authenticated:
            interaction = p.interactions.filter(user=request.user).first()
            if interaction:
                has_liked = interaction.type == 'LIKE'
                has_disliked = interaction.type == 'DISLIKE'

        data.append({
            "id": p.id,
            "title": p.title,
            "creator": p.user.username,
            "content": p.content,
            "idea": p.idea,
            "category": p.category,
            "tags": [t.strip() for t in p.tags.split(',')] if p.tags else [],
            "views": p.view_count,
            "likes": p.likes_count,
            "dislikes": p.dislikes_count,
            "comments_count": p.comments.count(),
            "has_liked": has_liked,
            "has_disliked": has_disliked,
            "created_at": p.created_at.strftime("%b %d, %Y")
        })
    
    return JsonResponse({
        "success": True, 
        "prompts": data,
        "has_more": end < total,
        "total": total
    })

@csrf_exempt
def interaction_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Login required."}, status=401)
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            prompt_id = data.get("prompt_id")
            action_type = data.get("type") # 'LIKE' or 'DISLIKE'
            
            prompt = Prompt.objects.get(id=prompt_id)
            
            # Toggles: If same type exists, delete it. If different type exists, update it.
            existing = Interaction.objects.filter(user=request.user, prompt=prompt).first()
            
            if existing:
                if existing.type == action_type:
                    existing.delete()
                    msg = "Interaction removed"
                else:
                    existing.type = action_type
                    existing.save()
                    msg = f"Changed to {action_type}"
            else:
                Interaction.objects.create(user=request.user, prompt=prompt, type=action_type)
                msg = f"Prompt {action_type}D"
                
                # Create notification for owner (Anonymous)
                if prompt.user != request.user:
                    Notification.objects.create(
                        recipient=prompt.user,
                        sender=None, # Anonymous
                        prompt=prompt,
                        type=action_type,
                        message=f"Your prompt was {action_type.lower()}d!"
                    )
            
            return JsonResponse({
                "success": True, 
                "message": msg,
                "likes": prompt.likes_count,
                "dislikes": prompt.dislikes_count
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
def comment_api(request):
    if request.method == "GET":
        prompt_id = request.GET.get("prompt_id")
        page = int(request.GET.get("page", 1))
        limit = 5 # Show 5 top-level threads at a time
        
        # Fetch top-level comments for the prompt first (paginated)
        top_comments = Comment.objects.filter(prompt_id=prompt_id, parent=None).order_by('-created_at')
        total_top = top_comments.count()
        start = (page - 1) * limit
        end = start + limit
        paginated_top = top_comments[start:end]
        
        # Now fetch all replies for these specific top comments to build the tree
        # For simplicity in this threaded model, we fetch all sub-comments for the prompt 
        # and filter them in memory, or just fetch everything and paginate the root.
        # Efficient approach: Fetch root comments, then fetch all related descendants.
        all_comments = Comment.objects.filter(prompt_id=prompt_id).select_related('user').order_by('created_at')
        
        # Build tree structure
        def build_tree(parent_id=None, source_list=None):
            tree = []
            for c in [x for x in source_list if x.parent_id == parent_id]:
                # Get user interaction status
                user_type = None
                if request.user.is_authenticated:
                    interaction = c.comment_interactions.filter(user=request.user).first()
                    if interaction: user_type = interaction.type

                tree.append({
                    "id": c.id,
                    "username": c.user.username,
                    "is_owner": c.user == request.user,
                    "content": c.content,
                    "likes": c.likes_count,
                    "dislikes": c.dislikes_count,
                    "user_type": user_type,
                    "created_at": c.created_at.strftime("%b %d, %H:%M"),
                    "replies": build_tree(c.id, source_list)
                })
            return tree

        # Build tree starting from the paginated root comments
        data = []
        for root in paginated_top:
            user_type = None
            if request.user.is_authenticated:
                interaction = root.comment_interactions.filter(user=request.user).first()
                if interaction: user_type = interaction.type

            data.append({
                "id": root.id,
                "username": root.user.username,
                "is_owner": root.user == request.user,
                "content": root.content,
                "likes": root.likes_count,
                "dislikes": root.dislikes_count,
                "user_type": user_type,
                "created_at": root.created_at.strftime("%b %d, %H:%M"),
                "replies": build_tree(root.id, all_comments)
            })

        return JsonResponse({
            "success": True, 
            "comments": data,
            "has_more": end < total_top,
            "total_top": total_top
        })

    if request.method == "POST":
        if not request.user.is_authenticated:
            return JsonResponse({"success": False, "error": "Login required."}, status=401)
        
        try:
            data = json.loads(request.body)
            action = data.get("action", "create")
            
            if action == "create":
                prompt_id = data.get("prompt_id")
                parent_id = data.get("parent_id") # Optional
                content = data.get("content")
                if not content: return JsonResponse({"success": False, "error": "Empty content."}, status=400)

                # Anti-Spam Check
                from django.utils import timezone
                from datetime import timedelta
                
                # 1. Frequency check (Cooldown)
                last_comment = Comment.objects.filter(user=request.user).order_by('-created_at').first()
                if last_comment and (timezone.now() - last_comment.created_at).total_seconds() < 10:
                    return JsonResponse({"success": False, "error": "Please wait 10s before posting again."}, status=429)
                
                # 2. Duplicate content check
                duplicate = Comment.objects.filter(
                    user=request.user, 
                    content__iexact=content.strip(),
                    created_at__gte=timezone.now() - timedelta(hours=1)
                ).exists()
                if duplicate:
                    return JsonResponse({"success": False, "error": "Duplicate comment detected."}, status=400)
                
                prompt = Prompt.objects.get(id=prompt_id)
                parent_comment = None
                if parent_id:
                    parent_comment = Comment.objects.get(id=parent_id)
                
                comment = Comment.objects.create(
                    user=request.user, 
                    prompt=prompt, 
                    parent=parent_comment,
                    content=content
                )
                
                # Notification Logic
                # 1. Reply Notification
                if parent_comment and parent_comment.user != request.user:
                    Notification.objects.create(
                        recipient=parent_comment.user, sender=request.user, prompt=prompt,
                        type='REPLY', message=f"{request.user.username} replied to your comment!"
                    )
                # 2. Mentions Logic
                import re
                mentions = re.findall(r'@(\w+)', content)
                for username in set(mentions):
                    try:
                        mentioned_user = User.objects.get(username=username)
                        if mentioned_user != request.user:
                            Notification.objects.create(
                                recipient=mentioned_user, sender=request.user, prompt=prompt,
                                type='MENTION', message=f"{request.user.username} mentioned you in a comment!"
                            )
                    except User.DoesNotExist: continue

                # 3. Prompt Owner Notification (only if not a reply/mention already)
                if prompt.user != request.user and not parent_comment:
                    Notification.objects.create(
                        recipient=prompt.user, sender=request.user, prompt=prompt,
                        type='COMMENT', message=f"{request.user.username} commented on your prompt!"
                    )
                
                return JsonResponse({"success": True, "message": "Comment posted!"})
            
            elif action == "edit":
                comment_id = data.get("comment_id")
                content = data.get("content")
                comment = Comment.objects.get(id=comment_id, user=request.user)
                comment.content = content
                comment.save()
                return JsonResponse({"success": True, "message": "Comment updated!"})
                
            elif action == "delete":
                comment_id = data.get("comment_id")
                Comment.objects.get(id=comment_id, user=request.user).delete()
                return JsonResponse({"success": True, "message": "Comment deleted!"})

            elif action == "interact":
                comment_id = data.get("comment_id")
                interaction_type = data.get("type") # LIKE or DISLIKE
                comment = Comment.objects.get(id=comment_id)
                
                existing = CommentInteraction.objects.filter(user=request.user, comment=comment).first()
                if existing:
                    if existing.type == interaction_type:
                        existing.delete()
                        msg = "Removed"
                    else:
                        existing.type = interaction_type
                        existing.save()
                        msg = f"Changed to {interaction_type}"
                else:
                    CommentInteraction.objects.create(user=request.user, comment=comment, type=interaction_type)
                    msg = f"{interaction_type}D"
                    
                    # Notify comment owner (Anonymous)
                    if comment.user != request.user:
                        Notification.objects.create(
                            recipient=comment.user,
                            sender=None,
                            prompt=comment.prompt,
                            type='LIKE' if interaction_type == 'LIKE' else 'DISLIKE',
                            message=f"Someone {interaction_type.lower()}d your comment!"
                        )
                
                return JsonResponse({
                    "success": True, 
                    "message": msg,
                    "likes": comment.likes_count,
                    "dislikes": comment.dislikes_count
                })
                
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

def notifications_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"success": False}, status=401)
    
    notifications = request.user.notifications.all()[:10]
    data = [{
        "id": n.id,
        "type": n.type,
        "message": n.message,
        "prompt_title": n.prompt.title if n.prompt else None,
        "is_read": n.is_read,
        "created_at": n.created_at.strftime("%b %d")
    } for n in notifications]
    
from admin_panel.models import Report as ModerationReport

@csrf_exempt
def report_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Login required."}, status=401)
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            target_type = data.get("target_type") # PROMPT or COMMENT
            target_id = data.get("target_id")
            reason = data.get("reason", "No reason provided")
            
            if target_type == "PROMPT":
                target = Prompt.objects.get(id=target_id)
                if target.user == request.user:
                    return JsonResponse({"success": False, "error": "You cannot report your own prompt."}, status=400)
                if target.is_private:
                    return JsonResponse({"success": False, "error": "Cannot report private content."}, status=400)
                
                # Create Report
                report = ModerationReport.objects.create(
                    reporter=request.user,
                    target_type="PROMPT",
                    prompt=target,
                    reason=reason,
                    ai_suggestion="Harmful Content Detection: Analysis pending.",
                    ai_score=0.5
                )
            else:
                target = Comment.objects.get(id=target_id)
                if target.user == request.user:
                    return JsonResponse({"success": False, "error": "You cannot report your own comment."}, status=400)
                
                # Create Report
                report = ModerationReport.objects.create(
                    reporter=request.user,
                    target_type="COMMENT",
                    comment=target,
                    reason=reason,
                    ai_suggestion="Toxicity Detection: Possible harassment.",
                    ai_score=0.7
                )
                
            return JsonResponse({"success": True, "message": "Report submitted. Moderators will review it shortly."})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
    
    return JsonResponse({"success": False}, status=405)

@csrf_exempt
def mark_notifications_read(request):
    if request.user.is_authenticated:
        request.user.notifications.filter(is_read=False).update(is_read=True)
        return JsonResponse({"success": True})
    return JsonResponse({"success": False}, status=401)

@csrf_exempt
def increment_view_api(request):
    try:
        data = json.loads(request.body)
        prompt_id = data.get("prompt_id")
        Prompt.objects.filter(id=prompt_id).update(view_count=models.F('view_count') + 1)
        return JsonResponse({"success": True})
    except:
        return JsonResponse({"success": False})

def get_usage(request):


    """View to get current usage stats for the frontend."""
    remaining = getattr(request, 'remaining_prompts', 5)
    limit_reached = getattr(request, 'limit_reached', False)
    
    return JsonResponse({
        "count": 5 - remaining if remaining != float('inf') else 0,
        "remaining": remaining if remaining != float('inf') else "Unlimited",
        "limit_reached": limit_reached
    })

def search_prompts_api(request):
    query = request.GET.get('q', '').strip()
    if not query:
        return JsonResponse({"success": True, "prompts": []})
    
    prompts = Prompt.objects.filter(
        Q(is_private=False) &
        (Q(title__icontains=query) | Q(user__username__icontains=query))
    ).select_related('user')[:5]
    
    data = [{
        "id": p.id,
        "title": p.title,
        "creator": p.user.username,
        "category": p.category,
        "preview": p.content[:100] + "..." if len(p.content) > 100 else p.content
    } for p in prompts]
    
    return JsonResponse({"success": True, "prompts": data})

def get_image_details_api(request):
    image_id = request.GET.get('image_id')
    try:
        img = AIImage.objects.select_related('user', 'prompt__user').get(id=image_id)
        return JsonResponse({
            "success": True,
            "id": img.id,
            "url": img.image.url,
            "title": img.title,
            "uploader": img.user.username,
            "uploader_id": img.user.id,
            "prompt_creator": img.prompt.user.username if img.prompt else None,
            "prompt_creator_id": img.prompt.user.id if img.prompt else None,
            "prompt_title": img.prompt.title if img.prompt else None,
            "prompt_id": img.prompt.id if img.prompt else None,
            "inspired_by": img.inspired_by,
            "ai_model": img.ai_model,
            "likes": img.likes_count,
            "is_liked": ImageInteraction.objects.filter(user=request.user, image=img, type='LIKE').exists() if request.user.is_authenticated else False
        })
    except AIImage.DoesNotExist:
        return JsonResponse({"success": False, "error": "Image not found"}, status=404)

@csrf_exempt
def upload_image_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Authentication required"}, status=401)
    
    if request.method == "POST":
        try:
            image_file = request.FILES.get('image')
            title = request.POST.get('title')
            prompt_id = request.POST.get('prompt_id')
            inspired_by = request.POST.get('inspired_by', '')
            ai_model = request.POST.get('ai_model', 'Unknown')
            tags = request.POST.get('tags', '')
            
            if not image_file:
                return JsonResponse({"success": False, "error": "Image is required"}, status=400)

            # Validate Prompt
            valid_prompt = None
            if prompt_id:
                try:
                    valid_prompt = Prompt.objects.get(id=prompt_id, is_private=False)
                except Prompt.DoesNotExist:
                    return JsonResponse({"success": False, "error": "Invalid or private prompt"}, status=400)

            ai_image = AIImage.objects.create(
                user=request.user,
                image=image_file,
                title=title or "Untitled Masterpiece",
                ai_model=ai_model,
                tags=tags,
                prompt=valid_prompt,
                inspired_by=inspired_by
            )
            
            return JsonResponse({
                "success": True,
                "image_id": ai_image.id,
                "image_url": ai_image.image.url
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

def showcase_feed_api(request):
    page_number = request.GET.get('page', 1)
    sort = request.GET.get('sort', 'latest')
    
    images = AIImage.objects.filter(is_public=True, is_moderated=False)
    
    if sort == 'popular':
        images = images.order_by('-view_count') 
    else:
        images = images.order_by('-created_at')

    paginator = Paginator(images, 12)
    page_obj = paginator.get_page(page_number)
    

    data = []
    for img in page_obj:
        data.append({
            "id": img.id,
            "url": img.image.url,
            "title": img.title,
            "creator": img.user.username,
            "category": img.category,
            "likes": img.likes_count,
            "views": img.view_count
        })
    
    return JsonResponse({
        "success": True,
        "images": data,
        "has_more": page_obj.has_next()
    })

@csrf_exempt
def image_interaction_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Auth required"}, status=401)
    
    if request.method == "POST":
        data = json.loads(request.body)
        image_id = data.get('image_id')
        action_type = data.get('type') # LIKE, DISLIKE
        
        image = AIImage.objects.get(id=image_id)
        interaction, created = ImageInteraction.objects.get_or_create(
            user=request.user, image=image,
            defaults={'type': action_type}
        )
        
        if not created:
            if interaction.type == action_type:
                interaction.delete()
            else:
                interaction.type = action_type
                interaction.save()
        
        # Notify
        if action_type == 'LIKE' and image.user != request.user:
            Notification.objects.create(
                recipient=image.user, sender=request.user,
                ai_image=image, type='IMAGE_LIKE',
                message=f"{request.user.username} liked your image '{image.title}'"
            )
            
        return JsonResponse({"success": True, "likes": image.likes_count})

@csrf_exempt
def image_comment_api(request):
    if request.method == "GET":
        image_id = request.GET.get('image_id')
        comments = ImageComment.objects.filter(image_id=image_id).select_related('user')
        data = [{
            "id": c.id,
            "user": c.user.username,
            "content": c.content,
            "created": c.created_at.strftime("%Y-%m-%d %H:%M")
        } for c in comments]
        return JsonResponse({"success": True, "comments": data})

    if not request.user.is_authenticated:
        return JsonResponse({"success": False}, status=401)

    if request.method == "POST":
        data = json.loads(request.body)
        image_id = data.get('image_id')
        content = data.get('content')
        
        image = AIImage.objects.get(id=image_id)
        comment = ImageComment.objects.create(user=request.user, image=image, content=content)
        
        # Notify
        if image.user != request.user:
            Notification.objects.create(
                recipient=image.user, sender=request.user,
                ai_image=image, type='IMAGE_COMMENT',
                message=f"{request.user.username} commented on your image '{image.title}'"
            )
            
        return JsonResponse({"success": True, "comment": {
            "id": comment.id,
            "user": comment.user.username,
            "content": comment.content,
            "created": comment.created_at.strftime("%Y-%m-%d %H:%M")
        }})

def prompt_detail_api(request):
    prompt_id = request.GET.get('id')
    try:
        p = Prompt.objects.select_related('user').get(id=prompt_id)
        if p.is_private and p.user != request.user:
            return JsonResponse({"success": False, "error": "Access denied"}, status=403)
        return JsonResponse({
            "success": True,
            "prompt": {
                "id": p.id, "title": p.title, "content": p.content, "idea": p.idea,
                "category": p.category, "creator": p.user.username,
                "created_at": p.created_at.strftime("%b %d, %Y"),
                "is_private": p.is_private, "likes": p.likes_count,
                "dislikes": p.dislikes_count, "views": p.view_count,
                "uploaded_image": p.uploaded_image.url if p.uploaded_image else None,
                "has_liked": p.interactions.filter(user=request.user, type='LIKE').exists() if request.user.is_authenticated else False,
                "has_disliked": p.interactions.filter(user=request.user, type='DISLIKE').exists() if request.user.is_authenticated else False,
            }
        })
    except Prompt.DoesNotExist:
        return JsonResponse({"success": False, "error": "Prompt not found"}, status=404)