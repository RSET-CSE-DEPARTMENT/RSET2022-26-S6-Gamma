from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError


# ===============================
# Document Model
# ===============================

class Document(models.Model):
    filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    file_type = models.CharField(max_length=10)
    upload_date = models.DateTimeField(auto_now_add=True)
    content_preview = models.TextField(blank=True, null=True)
    processed = models.BooleanField(default=False)
    summary = models.TextField(blank=True, null=True)

    # Use BigIntegerField to prevent overflow
    rfp_budget = models.BigIntegerField(null=True, blank=True)
    rfp_emd = models.BigIntegerField(null=True, blank=True)

    rfp_timeline_weeks = models.PositiveIntegerField(null=True, blank=True)

    no_of_days_for_analysis = models.PositiveIntegerField(null=True, blank=True)
    no_of_days_for_submission = models.PositiveIntegerField(null=True, blank=True)

    rfp_metadata = models.JSONField(null=True, blank=True)

    extraction_confidence = models.CharField(max_length=10, null=True, blank=True)
    extraction_notes = models.TextField(null=True, blank=True)

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("ACCEPTED", "Accepted"),
        ("REJECTED", "Rejected"),
        ("REVIEW", "Needs Review"),
    ]

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    class Meta:
        ordering = ['-upload_date']

    def __str__(self):
        return self.filename


# ===============================
# Keyword Model
# ===============================

class Keyword(models.Model):
    keyword = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['keyword']

    def __str__(self):
        return self.keyword


# ===============================
# DocumentKeyword Model
# ===============================

class DocumentKeyword(models.Model):

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='keywords'
    )

    keyword = models.ForeignKey(
        Keyword,
        on_delete=models.CASCADE,
        related_name='documents'
    )

    relevance_score = models.FloatField()

    class Meta:
        unique_together = ('document', 'keyword')
        ordering = ['-relevance_score']

    def __str__(self):
        return f"{self.document.filename} - {self.keyword.keyword}"


# ===============================
# Company Capability Model
# ===============================

class CompanyCapability(models.Model):

    tech_keywords = ArrayField(
        models.CharField(max_length=100),
        default=list
    )

    min_budget = models.BigIntegerField()
    max_budget = models.BigIntegerField()

    expected_emd_in_inr = models.BigIntegerField(null=True, blank=True)

    min_timeline_weeks = models.PositiveIntegerField()
    max_timeline_weeks = models.PositiveIntegerField()

    max_team_size = models.PositiveIntegerField()

    expected_timeline_weeks = models.PositiveIntegerField(null=True, blank=True)

    expected_no_of_days_for_analysis = models.PositiveIntegerField(null=True, blank=True)

    expected_no_of_days_for_submission = models.PositiveIntegerField(null=True, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Company Capability Profile"

    def clean(self):
        if not self.pk and CompanyCapability.objects.exists():
            raise ValidationError("Only one CompanyCapability instance allowed.")


# ===============================
# RFP Evaluation Model
# ===============================

class RFPEvaluation(models.Model):

    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name="evaluation",
    )

    technical_fit_score = models.FloatField(default=0.0)
    budget_fit_score = models.FloatField(default=0.0)
    timeline_fit_score = models.FloatField(default=0.0)
    capacity_fit_score = models.FloatField(default=0.0)
    overall_fit_score = models.FloatField(default=0.0)

    DECISION_CHOICES = [
        ("ACCEPT", "Accept"),
        ("REJECT", "Reject"),
        ("REVIEW", "Review"),
    ]

    decision = models.CharField(
        max_length=10,
        choices=DECISION_CHOICES,
        default="REVIEW",
    )

    reasoning = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Evaluation for {self.document.filename}"


# ===============================
# Document Chunk Model
# ===============================

class DocumentChunk(models.Model):

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chunks"
    )

    text = models.TextField()

    embedding = models.JSONField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chunk {self.id} - {self.document.filename}"

class GeneratedProposal(models.Model):

    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name="proposal"
    )

    executive_summary = models.TextField(blank=True)
    technical_approach = models.TextField(blank=True)
    timeline = models.TextField(blank=True)
    compliance_checklist = models.TextField(blank=True)

    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Proposal for {self.document.filename}"