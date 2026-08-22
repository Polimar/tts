from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.auth.dependencies import get_current_user_id
from app.config import get_settings
from app.db.database import get_db
from app.schemas import JobCreateRequest, JobOut
from app.services.security import new_id, resolve_under, validate_safe_segment

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _job_to_out(job: dict) -> JobOut:
    return JobOut(
        id=job["id"],
        voice_id=job["voice_id"],
        status=job["status"],
        language=job["language"],
        text=job["text"],
        chunk_count=job["chunk_count"],
        error=job["error"],
        wav_available=bool(job.get("wav_rel_path")),
        mp3_available=bool(job.get("mp3_rel_path")),
        device_used=job.get("device_used"),
        created_at=job["created_at"],
        started_at=job.get("started_at"),
        completed_at=job.get("completed_at"),
    )


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(body: JobCreateRequest, user_id: str = Depends(get_current_user_id)) -> JobOut:
    settings = get_settings()
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text required")
    if len(text) > settings.tts_max_text_chars:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text exceeds limit")

    db = get_db()
    voice = db.get_voice(body.voice_id, user_id)
    if not voice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice not found")

    job_id = new_id()
    job = db.create_job(
        job_id=job_id,
        user_id=user_id,
        voice_id=body.voice_id,
        language=body.language.strip() or voice["language"],
        text=text,
    )
    return _job_to_out(job)


@router.get("", response_model=list[JobOut])
def list_jobs(user_id: str = Depends(get_current_user_id)) -> list[JobOut]:
    return [_job_to_out(j) for j in get_db().list_jobs(user_id)]


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, user_id: str = Depends(get_current_user_id)) -> JobOut:
    try:
        validate_safe_segment(job_id, "job_id")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job id")

    job = get_db().get_job(job_id, user_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return _job_to_out(job)


@router.get("/{job_id}/download/{format}")
def download_job(
    job_id: str,
    format: str,
    user_id: str = Depends(get_current_user_id),
) -> FileResponse:
    settings = get_settings()
    try:
        validate_safe_segment(job_id, "job_id")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job id")

    if format not in {"wav", "mp3"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format must be wav or mp3")

    job = get_db().get_job(job_id, user_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job not completed")

    rel_key = "wav_rel_path" if format == "wav" else "mp3_rel_path"
    rel_path = job.get(rel_key)
    if not rel_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{format.upper()} not available")

    path = resolve_under(settings.users_dir, rel_path)
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk")

    media = "audio/wav" if format == "wav" else "audio/mpeg"
    return FileResponse(path, media_type=media, filename=Path(path).name)
