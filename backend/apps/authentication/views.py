from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample
from core.utils.throttles import AuthRateThrottle
from .serializers import RegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer
from .models import User


@extend_schema(
    tags=["Authentication"],
    summary="Register a new user",
    description="Creates a new user account (default role: owner). Returns the user profile and a JWT token pair. Rate limited to 10 req/min.",
    examples=[
        OpenApiExample(
            "Example request",
            value={"email": "owner@example.com", "password": "StrongPass123!", "password2": "StrongPass123!", "full_name": "John Owner", "phone": "+919876543210"},
            request_only=True,
        )
    ],
)
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Login",
    description="Authenticate with email + password. Returns access/refresh tokens and user info. Rate limited to 10 req/min.",
)
class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]
    serializer_class = CustomTokenObtainPairSerializer


@extend_schema(
    tags=["Authentication"],
    summary="Logout",
    description="Blacklist the refresh token, invalidating the session.",
)
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(tags=["Authentication"], summary="Get my profile"),
    patch=extend_schema(tags=["Authentication"], summary="Update my profile"),
    put=extend_schema(tags=["Authentication"], summary="Replace my profile", exclude=True),
)
class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
