from django.contrib import admin
from .models import Document, Keyword, DocumentKeyword, CompanyCapability

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'file_type', 'upload_date', 'processed', 'keyword_count']
    list_filter = ['file_type', 'processed', 'upload_date']
    search_fields = ['filename']
    
    def keyword_count(self, obj):
        return obj.keywords.count()
    keyword_count.short_description = 'Keywords'

@admin.register(Keyword)
class KeywordAdmin(admin.ModelAdmin):
    list_display = ['keyword', 'document_count']
    search_fields = ['keyword']
    
    def document_count(self, obj):
        return obj.documents.count()
    document_count.short_description = 'Documents'

@admin.register(DocumentKeyword)
class DocumentKeywordAdmin(admin.ModelAdmin):
    list_display = ['document', 'keyword', 'relevance_score']
    list_filter = ['document']
    ordering = ['-relevance_score']


admin.site.register(CompanyCapability)