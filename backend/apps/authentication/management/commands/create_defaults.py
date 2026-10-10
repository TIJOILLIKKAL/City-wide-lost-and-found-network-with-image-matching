from django.core.management.base import BaseCommand
from apps.authentication.models import User
from apps.venues.models import Venue


class Command(BaseCommand):
    help = "Create default admin, user, and venue staff accounts for development"

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
        venue = self._get_or_create_venue()
        self._create_staff(
            email="staff@lostandfound.com",
            password="staff@123",
            full_name="City Mall Staff",
            venue=venue,
        )

    def _get_or_create_venue(self):
        venue, created = Venue.objects.get_or_create(
            slug="city-mall",
            defaults={
                "name": "City Mall",
                "venue_type": Venue.VenueType.MALL,
                "status": Venue.Status.ACTIVE,
                "address": "1 Main Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001",
                "contact_name": "Mall Management",
                "contact_email": "mall@lostandfound.com",
                "contact_phone": "+91 9000000000",
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS("  Created venue: City Mall"))
        else:
            self.stdout.write(self.style.WARNING("  Already exists venue: City Mall"))
        return venue

    def _create_staff(self, email, password, full_name, venue):
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f"  Already exists: {email}"))
            return
        User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            role=User.Role.VENUE_STAFF,
            venue=venue,
            is_verified=True,
        )
        self.stdout.write(self.style.SUCCESS(f"  Created venue_staff: {email}"))

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
