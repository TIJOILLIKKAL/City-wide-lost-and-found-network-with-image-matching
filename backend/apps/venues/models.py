from django.db import models


class Venue(models.Model):
    class VenueType(models.TextChoices):
        MALL = "mall", "Shopping Mall"
        METRO = "metro", "Metro Station"
        AIRPORT = "airport", "Airport"
        HOTEL = "hotel", "Hotel"
        TAXI = "taxi", "Taxi Company"
        BUS_STATION = "bus_station", "Bus Station"
        RAILWAY = "railway", "Railway Station"
        HOSPITAL = "hospital", "Hospital"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    venue_type = models.CharField(max_length=20, choices=VenueType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    # Location
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Contact
    contact_name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)

    # Operating hours (stored as JSON: {"mon": "09:00-21:00", ...})
    operating_hours = models.JSONField(default=dict, blank=True)

    # B2B info
    registration_number = models.CharField(max_length=100, blank=True)
    logo = models.ImageField(upload_to="venues/logos/", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "venues"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.venue_type})"


class VenueOperatingHours(models.Model):
    class Day(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name="hours")
    day = models.IntegerField(choices=Day.choices)
    open_time = models.TimeField()
    close_time = models.TimeField()
    is_closed = models.BooleanField(default=False)

    class Meta:
        db_table = "venue_operating_hours"
        unique_together = ("venue", "day")
        ordering = ["day"]

    def __str__(self):
        return f"{self.venue.name} — {self.get_day_display()}"
