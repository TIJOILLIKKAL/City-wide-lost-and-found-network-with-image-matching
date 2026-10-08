import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("authentication", "0001_initial"),
        ("venues", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PickupSlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("venue", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="pickup_slots",
                    to="venues.venue",
                )),
                ("date", models.DateField()),
                ("start_time", models.TimeField()),
                ("end_time", models.TimeField()),
                ("capacity", models.PositiveIntegerField(default=5)),
                ("booked_count", models.PositiveIntegerField(default=0)),
            ],
            options={"db_table": "pickup_slots", "ordering": ["date", "start_time"],
                     "unique_together": {("venue", "date", "start_time")}},
        ),
        migrations.CreateModel(
            name="Claim",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("found_item_id", models.CharField(max_length=24)),
                ("lost_item_id", models.CharField(blank=True, max_length=24)),
                ("claimant", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="claims_made",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("reviewed_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="claims_reviewed",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("venue", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="claims",
                    to="venues.venue",
                )),
                ("status", models.CharField(
                    choices=[
                        ("pending", "Pending Review"),
                        ("under_review", "Under Review"),
                        ("approved", "Approved"),
                        ("rejected", "Rejected"),
                        ("pickup_scheduled", "Pickup Scheduled"),
                        ("out_for_delivery", "Out for Delivery"),
                        ("completed", "Completed"),
                        ("cancelled", "Cancelled"),
                    ],
                    default="pending",
                    max_length=20,
                )),
                ("proof_description", models.TextField()),
                ("proof_images", models.JSONField(blank=True, default=list)),
                ("rejection_reason", models.TextField(blank=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("delivery_method", models.CharField(
                    blank=True,
                    choices=[("pickup", "Self Pickup"), ("courier", "Courier Delivery")],
                    max_length=10,
                )),
                ("pickup_slot", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="claims",
                    to="claims.pickupslot",
                )),
                ("delivery_address", models.TextField(blank=True)),
                ("delivery_tracking_id", models.CharField(blank=True, max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "claims", "ordering": ["-created_at"],
                     "unique_together": {("found_item_id", "claimant")}},
        ),
        migrations.CreateModel(
            name="ClaimStatusHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("claim", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="history",
                    to="claims.claim",
                )),
                ("from_status", models.CharField(blank=True, max_length=20)),
                ("to_status", models.CharField(max_length=20)),
                ("changed_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
                ("note", models.TextField(blank=True)),
                ("changed_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "claim_status_history", "ordering": ["changed_at"]},
        ),
    ]
