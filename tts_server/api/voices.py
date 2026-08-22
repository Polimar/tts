from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from tts_server.auth.dependencies import get_current_user_id
from tts_server.config import settings, secure_mkdir
from tts_server.db.database import get_db
from tts_server.schemas import VoiceOut
from tts_server.services.audio_validate import validate_audio_upload
from tts_server.services.http_timeouts import run_blocking_io
from tts_server.services.security import (
    ALLOWED_AUDIO_EXTENSIONS,
    new_id,
    rel_to_users_dir,
    sanitize_filename,
    user_root,
    validate_safe_segment,
    voice_audio_path,
)
from tts_server.services.upload import stream_upload_bounded

router = APIRouter(prefix="/voices", tags=["voices"])


@router.post("", response_model=VoiceOut, status_code=status.HTTP_201_CREATED)
async def create_voice(
    request: Request,
    name: str = Form(...),
    ref_text: str = Form(...),
    language: str = Form(default="Italian"),
    audio: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> VoiceOut:
    if not name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name required")
    if not ref_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ref_text required")

    filename = sanitize_filename(audio.filename or "reference.wav")
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format. Allowed: {sorted(ALLOWED_AUDIO_EXTENSIONS)}",
        )

    voice_id = new_id()
    dest = voice_audio_path(settings.users_dir, user_id, voice_id, filename)
    secure_mkdir(dest.parent)

    _, header = await stream_upload_bounded(
        request,
        audio,
        dest,
        settings.max_upload_bytes,
    )

    try:
        validate_audio_upload(header, audio.content_type, ext)
    except ValueError as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    def _persist() -> VoiceOut:
        rel_path = rel_to_users_dir(settings.users_dir, dest)
        voice = get_db().create_voice(
            voice_id=voice_id,
            user_id=user_id,
            name=name.strip(),
            ref_text=ref_text.strip(),
            audio_rel_path=rel_path,
            language=language.strip() or "Italian",
        )
        return VoiceOut(
            id=voice["id"],
            name=voice["name"],
            ref_text=voice["ref_text"],
            language=voice["language"],
            created_at=voice["created_at"],
        )

    return await run_blocking_io(_persist, "POST /voices")


@router.get("", response_model=list[VoiceOut])
async def list_voices(user_id: str = Depends(get_current_user_id)) -> list[VoiceOut]:
    def _list() -> list[VoiceOut]:
        voices = get_db().list_voices(user_id)
        return [
            VoiceOut(
                id=v["id"],
                name=v["name"],
                ref_text=v["ref_text"],
                language=v["language"],
                created_at=v["created_at"],
            )
            for v in voices
        ]

    return await run_blocking_io(_list, "GET /voices")


@router.get("/{voice_id}", response_model=VoiceOut)
async def get_voice(voice_id: str, user_id: str = Depends(get_current_user_id)) -> VoiceOut:
    try:
        validate_safe_segment(voice_id, "voice_id")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid voice id")

    def _get() -> VoiceOut:
        voice = get_db().get_voice(voice_id, user_id)
        if not voice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice not found")
        return VoiceOut(
            id=voice["id"],
            name=voice["name"],
            ref_text=voice["ref_text"],
            language=voice["language"],
            created_at=voice["created_at"],
        )

    return await run_blocking_io(_get, f"GET /voices/{voice_id}")


@router.delete("/{voice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice(voice_id: str, user_id: str = Depends(get_current_user_id)) -> None:
    try:
        validate_safe_segment(voice_id, "voice_id")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid voice id")

    def _delete() -> None:
        if not get_db().delete_voice(voice_id, user_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice not found")

        voice_dir = user_root(settings.users_dir, user_id) / "voices" / voice_id
        if voice_dir.is_dir():
            for child in voice_dir.rglob("*"):
                if child.is_file():
                    child.unlink()
            for child in sorted(voice_dir.rglob("*"), reverse=True):
                if child.is_dir():
                    child.rmdir()
            voice_dir.rmdir()

    await run_blocking_io(_delete, f"DELETE /voices/{voice_id}")
