from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'documents/<int:pk>/generate_proposal/',
        DocumentViewSet.as_view({'post': 'generate_proposal_view'}),
        name='document-generate-proposal'
    ),
    path(
        'documents/<int:pk>/evaluation/',
        DocumentViewSet.as_view({'get': 'get_evaluation'}),
        name='document-evaluation'
    ),
]