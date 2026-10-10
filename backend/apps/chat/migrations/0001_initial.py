from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("claims", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatRoom",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("claim", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="chat_room", to="claims.claim")),
            ],
            options={"db_table": "chat_rooms"},
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("text", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("room", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="chat.chatroom")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_messages", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "chat_messages", "ordering": ["created_at"]},
        ),
    ]
