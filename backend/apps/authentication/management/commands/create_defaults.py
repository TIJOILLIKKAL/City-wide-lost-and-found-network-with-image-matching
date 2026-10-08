from django.core.management.base import BaseCommand
from apps.authentication.models import User


class Command(BaseCommand):
    help = "Create default admin and user accounts for development"

    def handle(self, *args, **options):
        self._create(
            email="admin@lostandfound.com",
            password="admin@123",
            full_name="Default Admin",
            role=User.Role.ADMIN,
        )
        self._create(
            email="user@lostandfound.com",
            password="user@123",
            full_name="Default User",
            role=User.Role.OWNER,
        )

    def _create(self, email, password, full_name, role):
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f"  Already exists: {email}"))
            return
        User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            role=role,
            is_verified=True,
        )
        self.stdout.write(self.style.SUCCESS(f"  Created {role}: {email}"))
