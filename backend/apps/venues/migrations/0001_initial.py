from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Venue",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("slug", models.SlugField(max_length=255, unique=True)),
                ("venue_type", models.CharField(
                    choices=[
                        ("mall", "Shopping Mall"),
                        ("metro", "Metro Station"),
                        ("airport", "Airport"),
                        ("hotel", "Hotel"),
                        ("taxi", "Taxi Company"),
                        ("bus_station", "Bus Station"),
                        ("railway", "Railway Station"),
                        ("hospital", "Hospital"),
                        ("other", "Other"),
                    ],
                    max_length=20,
                )),
                ("status", models.CharField(
                    choices=[
                        ("active", "Active"),
                        ("inactive", "Inactive"),
                        ("suspended", "Suspended"),
                    ],
                    default="active",
                    max_length=20,
                )),
                ("address", models.TextField()),
                ("city", models.CharField(max_length=100)),
                ("state", models.CharField(max_length=100)),
                ("pincode", models.CharField(max_length=10)),
                ("latitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("contact_name", models.CharField(max_length=255)),
                ("contact_email", models.EmailField()),
                ("contact_phone", models.CharField(max_length=20)),
                ("operating_hours", models.JSONField(blank=True, default=dict)),
                ("registration_number", models.CharField(blank=True, max_length=100)),
                ("logo", models.ImageField(blank=True, null=True, upload_to="venues/logos/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "venues", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="VenueOperatingHours",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("venue", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="hours", to="venues.venue")),
                ("day", models.IntegerField(
                    choices=[
                        (0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
                        (3, "Thursday"), (4, "Friday"), (5, "Saturday"), (6, "Sunday"),
                    ]
                )),
                ("open_time", models.TimeField()),
                ("close_time", models.TimeField()),
                ("is_closed", models.BooleanField(default=False)),
            ],
            options={"db_table": "venue_operating_hours", "ordering": ["day"], "unique_together": {("venue", "day")}},
        ),
    ]
