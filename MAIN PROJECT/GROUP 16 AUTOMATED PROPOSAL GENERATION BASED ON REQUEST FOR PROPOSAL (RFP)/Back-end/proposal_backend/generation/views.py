from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from django.db import transaction

from .models import (
    Document,
    Keyword,
    DocumentKeyword,
    GeneratedProposal
)

from .serializers import (
    DocumentSerializer,
    FileUploadSerializer,
)

from .services import (
    DocumentParser,
    KeywordExtractor,
    DocumentSummarizer,
    evaluate_and_save,
    RFPMetadataExtractor,
    index_document,
)


class DocumentViewSet(viewsets.ModelViewSet):

    queryset = Document.objects.all().order_by("-upload_date")

    serializer_class = DocumentSerializer

    parser_classes = (MultiPartParser, FormParser, JSONParser)

    ############################################################
    # DOCUMENT UPLOAD ENDPOINT
    ############################################################

    @action(detail=False, methods=["post"], url_path="upload")
    def upload_document(self, request):
        print("=== UPLOAD REQUEST RECEIVED ===")
        serializer = FileUploadSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = serializer.validated_data["file"]

        file_extension = uploaded_file.name.split(".")[-1].lower()

        try:

            ####################################################
            # STEP 1: PARSE DOCUMENT
            ####################################################
            print("=== STEP 2: PARSING DOCUMENT ===")
            parser = DocumentParser()

            text = parser.parse(uploaded_file, file_extension)

            if not text or len(text.strip()) < 50:
                return Response(
                    {"error": "Failed to extract usable text"},
                    status=400,
                )

            ####################################################
            # VERY IMPORTANT FIX
            # Reset file pointer BEFORE saving to Django FileField
            ####################################################

            uploaded_file.seek(0)

            ####################################################
            # STEP 2: EXTRACT KEYWORDS
            ####################################################
            print("=== STEP 3: EXTRACTING KEYWORDS ===")
            extractor = KeywordExtractor()

            keywords_with_scores = extractor.extract_keywords(
                text,
                top_n=15,
            )

            ####################################################
            # STEP 3: GENERATE SUMMARY
            ####################################################
            print("=== STEP 4: GENERATING SUMMARY ===")
            summarizer = DocumentSummarizer()

            summary_text = summarizer.generate_summary(
                text,
                max_length=12000,
            )

            ####################################################
            # STEP 4: EXTRACT METADATA
            ####################################################
            print("=== STEP 5: EXTRACTING METADATA ===")
            metadata_extractor = RFPMetadataExtractor()

            meta = metadata_extractor.extract_metadata(text)

            rfp_budget = meta.get("budget_in_inr")

            rfp_timeline_weeks = meta.get("timeline_weeks")

            ####################################################
            # STEP 5: SAVE EVERYTHING (ATOMIC)
            ####################################################
            print("=== STEP 6: SAVING TO DATABASE ===")
            with transaction.atomic():

                ############################################
                # CREATE DOCUMENT
                ############################################

                document = Document.objects.create(
                    filename=uploaded_file.name,
                    file=uploaded_file,
                    file_type=file_extension,
                    content_preview=text[:3000],
                    summary=summary_text,
                    processed=False,
                    rfp_budget=rfp_budget,
                    rfp_timeline_weeks=rfp_timeline_weeks,
                )

                ############################################
                # INDEX DOCUMENT FOR RAG
                ############################################
                print("=== STEP 7: INDEXING DOCUMENT ===")
                index_document(document, text)

                ############################################
                # SAVE KEYWORDS (PREVENT DUPLICATES)
                ############################################
                print("=== STEP 8: SAVING KEYWORDS ===")
                keyword_objects = []

                for keyword_text, score in keywords_with_scores:

                    keyword_text = keyword_text.lower().strip()

                    keyword, _ = Keyword.objects.get_or_create(
                        keyword=keyword_text
                    )

                    keyword_objects.append(
                        DocumentKeyword(
                            document=document,
                            keyword=keyword,
                            relevance_score=float(score),
                        )
                    )

                DocumentKeyword.objects.bulk_create(
                    keyword_objects
                )

                ############################################
                # STEP 6: EVALUATE DOCUMENT
                ############################################
                print("=== STEP 9: EVALUATING ===")
                evaluation = evaluate_and_save(document)

            ####################################################
            # STEP 7: BUILD RESPONSE
            ####################################################
            print("=== STEP 10: BUILDING RESPONSE ===")
            response_serializer = DocumentSerializer(document)

            response_data = response_serializer.data

            ############################################
            # ADD KEYWORDS TO RESPONSE
            ############################################

            response_data["keywords"] = [
                {
                    "keyword": kw,
                    "relevance_score": float(score),
                }
                for kw, score in keywords_with_scores
            ]

            ############################################
            # ADD METADATA TO RESPONSE
            ############################################

            response_data["rfp_metadata"] = {
                "budget_in_inr": rfp_budget,
                "timeline_weeks": rfp_timeline_weeks,
                "team_size": meta.get("team_size"),
                "confidence": meta.get("confidence"),
                "notes": meta.get("notes"),
            }

            ############################################
            # ADD EVALUATION TO RESPONSE
            ############################################

            response_data["evaluation"] = {
                "technical_fit_score": evaluation.technical_fit_score,
                "budget_fit_score": evaluation.budget_fit_score,
                "timeline_fit_score": evaluation.timeline_fit_score,
                "overall_fit_score": evaluation.overall_fit_score,
                "decision": evaluation.decision,
                "reasoning": evaluation.reasoning,
            }

            return Response(
                response_data,
                status=status.HTTP_201_CREATED,
            )

        ####################################################
        # ERROR HANDLING
        ####################################################

        except Exception as e:

            import traceback

            traceback.print_exc()

            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], url_path="generate_proposal")
    def generate_proposal_view(self, request, pk=None):
        """Generate a full proposal for the given document using Gemini + RAG."""
        from .proposal_service import generate_proposal
        from .models import GeneratedProposal

        try:
            document = self.get_object()

            # Check if proposal already exists
            existing = GeneratedProposal.objects.filter(document=document).first()
            if existing and not request.data.get("regenerate"):
                return Response({
                    "id": existing.id,
                    "document_id": document.id,
                    "filename": document.filename,
                    "executive_summary": existing.executive_summary,
                    "technical_approach": existing.technical_approach,
                    "timeline": existing.timeline,
                    "compliance_checklist": existing.compliance_checklist,
                    "generated_at": existing.generated_at,
                    "cached": True,
                }, status=200)

            print(f"=== GENERATING PROPOSAL FOR: {document.filename} ===")
            sections = generate_proposal(document)

            # Save to database
            proposal, _ = GeneratedProposal.objects.update_or_create(
                document=document,
                defaults={
                    "executive_summary": sections["executive_summary"],
                    "technical_approach": sections["technical_approach"],
                    "timeline": sections["timeline"],
                    "compliance_checklist": sections["compliance_checklist"],
                }
            )

            print("=== PROPOSAL GENERATED SUCCESSFULLY ===")

            return Response({
                "id": proposal.id,
                "document_id": document.id,
                "filename": document.filename,
                "executive_summary": proposal.executive_summary,
                "technical_approach": proposal.technical_approach,
                "timeline": proposal.timeline,
                "compliance_checklist": proposal.compliance_checklist,
                "generated_at": proposal.generated_at,
                "cached": False,
            }, status=201)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=500
            )
    @action(detail=True, methods=["get"], url_path="evaluation")
    def get_evaluation(self, request, pk=None):
        """Return evaluation data for a document."""
        try:
            document = self.get_object()
            evaluation = document.evaluation
            return Response({
                "technical_fit_score": evaluation.technical_fit_score,
                "budget_fit_score": evaluation.budget_fit_score,
                "timeline_fit_score": evaluation.timeline_fit_score,
                "overall_fit_score": evaluation.overall_fit_score,
                "decision": evaluation.decision,
                "reasoning": evaluation.reasoning,
            })
        except Exception:
            return Response(
                {"error": "No evaluation found for this document"},
                status=404
            )


























        