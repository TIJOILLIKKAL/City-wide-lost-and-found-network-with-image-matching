from rest_framework import serializers

ITEM_CATEGORIES = [
    ("bag", "Bag / Luggage"),
    ("phone", "Phone / Tablet"),
    ("wallet", "Wallet / Purse"),
    ("keys", "Keys"),
    ("clothing", "Clothing / Accessories"),
    ("document", "Document / ID"),
    ("electronics", "Electronics"),
    ("jewelry", "Jewelry / Watch"),
    ("other", "Other"),
]

CATEGORY_VALUES = [c[0] for c in ITEM_CATEGORIES]


class FoundItemCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    category = serializers.ChoiceField(choices=CATEGORY_VALUES)
    color = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    brand = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    image = serializers.ImageField(required=False)
    found_at = serializers.DateTimeField()
    found_location = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    attributes = serializers.DictField(child=serializers.CharField(), required=False, default=dict)


class LostItemCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    category = serializers.ChoiceField(choices=CATEGORY_VALUES)
    color = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    brand = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    image = serializers.ImageField(required=False)
    lost_at = serializers.DateTimeField()
    lost_location = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    attributes = serializers.DictField(child=serializers.CharField(), required=False, default=dict)


class ItemImageSerializer(serializers.Serializer):
    url = serializers.CharField()
    key = serializers.CharField()


class ItemResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    item_type = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    color = serializers.CharField()
    brand = serializers.CharField()
    image_url = serializers.CharField()
    images = ItemImageSerializer(many=True, required=False)
    status = serializers.CharField()
    embedding_status = serializers.CharField()
    venue_id = serializers.IntegerField(required=False)
    reported_by = serializers.IntegerField()
    created_at = serializers.DateTimeField()
