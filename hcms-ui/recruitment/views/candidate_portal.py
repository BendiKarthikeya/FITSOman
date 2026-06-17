"""
recruitment/views/candidate_portal.py

Public (no-login) portal for candidates to:
  - View their offer letter summary
  - Upload required documents (medical cert, marksheets, etc.)

Access is token-gated via OfferLetter.portal_token (UUID in the URL).
"""

import os

from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from recruitment.models import CandidatePortalUpload, OfferLetter

_ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "doc", "docx"}
_MAX_FILE_MB = 10


def candidate_portal(request, token):
    """Public portal — candidates view their offer and upload documents."""
    offer = get_object_or_404(OfferLetter, portal_token=token)

    # Only show the portal once the offer has been sent
    if offer.status not in ("sent", "accepted", "joined"):
        raise Http404

    uploads = offer.portal_uploads.all().order_by("uploaded_at")
    uploaded_types = set(uploads.values_list("document_type", flat=True))

    document_slots = [
        {
            "type": code,
            "label": label,
            "uploaded": code in uploaded_types,
            "files": uploads.filter(document_type=code),
        }
        for code, label in CandidatePortalUpload.DOCUMENT_TYPES
    ]

    return render(request, "recruitment/portal/candidate_portal.html", {
        "offer": offer,
        "candidate": offer.candidate_id,
        "document_slots": document_slots,
        "uploads": uploads,
        "token": str(token),
    })


@require_POST
def candidate_portal_upload(request, token):
    """Handle document upload POSTed from the portal page."""
    offer = get_object_or_404(OfferLetter, portal_token=token)

    if offer.status not in ("sent", "accepted", "joined"):
        raise Http404

    doc_type = request.POST.get("document_type", "").strip()
    label = request.POST.get("label", "").strip()[:100]
    notes = request.POST.get("notes", "").strip()
    uploaded_file = request.FILES.get("file")

    valid_types = {code for code, _ in CandidatePortalUpload.DOCUMENT_TYPES}
    if doc_type not in valid_types:
        return JsonResponse({"ok": False, "error": "Invalid document type."}, status=400)

    if not uploaded_file:
        return JsonResponse({"ok": False, "error": "No file provided."}, status=400)

    ext = os.path.splitext(uploaded_file.name)[-1].lstrip(".").lower()
    if ext not in _ALLOWED_EXTENSIONS:
        return JsonResponse(
            {"ok": False, "error": f"File type .{ext} is not allowed. Use PDF, JPG, PNG, DOC, or DOCX."},
            status=400,
        )

    if uploaded_file.size > _MAX_FILE_MB * 1024 * 1024:
        return JsonResponse(
            {"ok": False, "error": f"File exceeds {_MAX_FILE_MB} MB limit."},
            status=400,
        )

    upload = CandidatePortalUpload.objects.create(
        offer=offer,
        document_type=doc_type,
        label=label,
        notes=notes,
        file=uploaded_file,
    )

    # Recalculate documents_completion_pct on the offer
    total_types = len(CandidatePortalUpload.DOCUMENT_TYPES)
    done_types = offer.portal_uploads.values("document_type").distinct().count()
    offer.documents_completion_pct = int((done_types / total_types) * 100)
    offer.save(update_fields=["documents_completion_pct"])

    return JsonResponse({
        "ok": True,
        "upload_id": upload.id,
        "filename": upload.filename,
        "document_type": upload.get_document_type_display(),
        "uploaded_at": upload.uploaded_at.strftime("%d %b %Y, %H:%M"),
        "documents_pct": offer.documents_completion_pct,
    })


def candidate_portal_delete(request, token, upload_id):
    """Allow candidate to remove an upload they made."""
    if request.method != "POST":
        return redirect("candidate-portal", token=token)

    offer = get_object_or_404(OfferLetter, portal_token=token)
    upload = get_object_or_404(CandidatePortalUpload, id=upload_id, offer=offer)
    upload.file.delete(save=False)
    upload.delete()

    # Recalculate completion
    total_types = len(CandidatePortalUpload.DOCUMENT_TYPES)
    done_types = offer.portal_uploads.values("document_type").distinct().count()
    offer.documents_completion_pct = int((done_types / total_types) * 100)
    offer.save(update_fields=["documents_completion_pct"])

    return redirect("candidate-portal", token=token)
