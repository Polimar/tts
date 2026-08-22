from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from tts_server.auth.dependencies import get_current_user_id
from tts_server.config import settings, secure_mkdir
from tts_server.db.database import get_db
from tts_server.schemas import VoiceOut
from tts_server.services.security import (
    ALLOWED_AUDIO_EXTENSIONS,
    is_allowed_audio_mime,
    new_id,
    rel_to_users_dir,
    sanitize_filename,
    user_root,
    validate_safe_segment,
    voice_audio_path,
)

router = APIRouter(prefix="/voices", tags=["voices"])


@router.post("", response_model=VoiceOut, status_code=status.HTTP_201_CREATED)
async def create_voice(
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
    if not is_allowed_audio_mime(audio.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio MIME type: {audio.content_type}",
        )

    content = await audio.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Upload too large")
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty upload")

    voice_id = new_id()
    dest = voice_audio_path(settings.users_dir, user_id, voice_id, filename)
    secure_mkdir(dest.parent)
    dest.write_bytes(content)

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


@router.get("", response_model=list[VoiceOut])
def list_voices(user_id: str = Depends(get_current_user_id)) -> list[VoiceOut]:
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


@router.get("/{voice_id}", response_model=VoiceOut)
def get_voice(voice_id: str, user_id: str = Depends(get_current_user_id)) -> VoiceOut:
    try:
        validate_safe_segment(voice_id, "voice_id")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid voice id")

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


@router.delete("/{voice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_voice(voice_id: str, user_id: str = Depends(get_current_user_id)) -> None:
    try:
        validate_safe_segment(voice_id, "voice_id")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid voice id")

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
