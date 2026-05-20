import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

class PromptEncryption:
    def __init__(self):
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            raise ValueError("ENCRYPTION_KEY not found in environment variables.")
        self.fernet = Fernet(key.encode())

    def encrypt(self, text):
        if not text:
            return text
        return self.fernet.encrypt(text.encode()).decode()

    def decrypt(self, encrypted_text):
        if not encrypted_text:
            return encrypted_text
        try:
            return self.fernet.decrypt(encrypted_text.encode()).decode()
        except Exception:
            return None # Return None on failure so views can handle it properly

prompt_encryption = PromptEncryption()
