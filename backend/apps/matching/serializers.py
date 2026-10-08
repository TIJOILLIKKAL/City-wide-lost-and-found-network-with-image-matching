from rest_framework import serializers


class MatchResultSerializer(serializers.Serializer):
    item_id = serializers.CharField()
    item_type = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField(required=False)
    category = serializers.CharField()
    venue_id = serializers.CharField(required=False, allow_null=True)
    status = serializers.CharField()
    score = serializers.FloatField()
    reported_at = serializers.DateTimeField(required=False, allow_null=True)


class ImageSearchSerializer(serializers.Serializer):
    image = serializers.ImageField()
    item_type = serializers.ChoiceField(choices=["found", "lost"], default="found")
    top_k = serializers.IntegerField(min_value=1, max_value=50, default=10)


class TextSearchSerializer(serializers.Serializer):
    query = serializers.CharField(min_length=2, max_length=500)
    item_type = serializers.ChoiceField(choices=["found", "lost"], default="found")
    category = serializers.CharField(required=False, allow_blank=True)
    top_k = serializers.IntegerField(min_value=1, max_value=50, default=10)
