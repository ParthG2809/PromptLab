import random
from django.core.mail import send_mail
from django.conf import settings
from .models import OTPVerification

from django.template.loader import render_to_string
from django.utils.html import strip_tags

def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(email, otp, purpose):
    subject = "Your Verification Code | PromptLab"
    purpose_text = "registration" if purpose == 'register' else "password reset"
    
    context = {
        'otp': otp,
        'purpose_text': purpose_text
    }
    
    html_message = render_to_string('accounts/email_otp.html', context)
    plain_message = strip_tags(html_message)
    
    email_from = settings.EMAIL_HOST_USER
    recipient_list = [email]
    
    try:
        send_mail(subject, plain_message, email_from, recipient_list, html_message=html_message)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
