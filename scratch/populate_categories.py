import os
import django
import sys

# Setup Django environment
sys.path.append('d:\\Tops Python Practice\\Projects\\Image_Prompt_Generator')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Image_Prompt_Generator.settings')
django.setup()

from promptapp.models import Category, Subcategory, Prompt, AIImage
from django.utils.text import slugify

def run():
    print("Populating Categories...")
    
    data = [
        {
            "name": "Image Prompts",
            "icon": "Brush",
            "subcategories": [
                "Portrait Art", "Landscape", "Character Design", 
                "Concept Art", "Digital Illustration", "Photorealistic"
            ]
        },
        {"name": "General / Any Query", "icon": "MessageCircle", "subcategories": []},
        {"name": "Coding & Technical", "icon": "Code", "subcategories": []},
        {"name": "Creative Writing", "icon": "PenTool", "subcategories": []},
        {"name": "Summarization Prompts", "icon": "FileText", "subcategories": []},
    ]

    for cat_data in data:
        cat, created = Category.objects.get_or_create(
            name=cat_data["name"],
            defaults={'slug': slugify(cat_data["name"]), 'icon_svg': cat_data["icon"]}
        )
        if created:
            print(f"Created Category: {cat.name}")
        
        for sub_name in cat_data["subcategories"]:
            sub, s_created = Subcategory.objects.get_or_create(
                category=cat,
                name=sub_name,
                defaults={'slug': slugify(sub_name)}
            )
            if s_created:
                print(f"  Created Subcategory: {sub.name}")

    print("\nMigrating existing Prompts...")
    prompts = Prompt.objects.filter(new_category__isnull=True)
    for p in prompts:
        # Match by name (naive)
        cat = Category.objects.filter(name__icontains=p.category).first()
        if cat:
            p.new_category = cat
            # Try matching subcategory
            sub = Subcategory.objects.filter(category=cat, name__icontains=p.sub_style).first()
            if sub:
                p.new_subcategory = sub
            p.save()
            print(f"Updated Prompt: {p.title}")

    print("\nMigrating existing AI Images...")
    images = AIImage.objects.filter(new_category__isnull=True)
    for img in images:
        if img.prompt and img.prompt.new_category:
            img.new_category = img.prompt.new_category
            img.new_subcategory = img.prompt.new_subcategory
            img.save()
            print(f"Updated Image: {img.title}")

if __name__ == "__main__":
    run()
