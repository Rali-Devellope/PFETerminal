from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from core.permissions import IsAdmin
from core.throttling import LoginRateThrottle
from core.exceptions import success_response, error_response
from .models import CustomUser
from .serializers import (
    CreateUserSerializer, UserSerializer, UpdateUserSerializer,
    LoginSerializer, ChangePasswordSerializer
)
from .services import create_user_by_admin, reset_password


class AdminCreateUserView(generics.CreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = CreateUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = create_user_by_admin(**serializer.validated_data)
        return success_response(
            data=UserSerializer(user).data,
            message='Compte créé. Email envoyé.',
            status_code=status.HTTP_201_CREATED,
        )


class UserListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = UserSerializer
    queryset = CustomUser.objects.all().order_by('-created_at')


class UserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdmin]
    queryset = CustomUser.objects.all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UpdateUserSerializer
        return UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    refresh = RefreshToken.for_user(user)
    return success_response(data={
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
        'must_change_password': user.is_first_login,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return error_response('refresh token requis')
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
    except TokenError:
        return error_response('Token invalide')
    return success_response(message='Déconnexion réussie')


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def me_view(request):
    if request.method == 'GET':
        return success_response(data=UserSerializer(request.user).data)
    serializer = UpdateUserSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return success_response(data=UserSerializer(serializer.instance).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    reset_password(
        request.user,
        serializer.validated_data['old_password'],
        serializer.validated_data['new_password'],
    )
    return success_response(message='Mot de passe modifié avec succès')
