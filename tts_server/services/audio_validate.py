"""Validate uploaded audio via magic bytes and Content-Type."""

from tts_server.services.security import ALLOWED_AUDIO_MIME, normalize_mime

_EXT_TO_FORMAT = {
    ".wav": "wav",
    ".mp3": "mp3",
    ".flac": "flac",
    ".ogg": "ogg",
    ".m4a": "m4a",
}

_MIME_TO_FORMATS: dict[str, set[str]] = {
    "audio/wav": {"wav"},
    "audio/x-wav": {"wav"},
    "audio/wave": {"wav"},
    "audio/mpeg": {"mp3"},
    "audio/mp3": {"mp3"},
    "audio/flac": {"flac"},
    "audio/x-flac": {"flac"},
    "audio/ogg": {"ogg"},
    "application/ogg": {"ogg"},
    "audio/mp4": {"m4a"},
    "audio/x-m4a": {"m4a"},
    "audio/m4a": {"m4a"},
    "application/octet-stream": {"wav", "mp3", "flac", "ogg", "m4a"},
}


def detect_audio_format(header: bytes) -> str | None:
    if len(header) < 4:
        return None
    if header[:4] == b"RIFF" and len(header) >= 12 and header[8:12] == b"WAVE":
        return "wav"
    if header[:3] == b"ID3":
        return "mp3"
    if len(header) >= 2 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0:
        return "mp3"
    if header[:4] == b"fLaC":
        return "flac"
    if header[:4] == b"OggS":
        return "ogg"
    if len(header) >= 8 and header[4:8] == b"ftyp":
        return "m4a"
    return None


def validate_audio_upload(header: bytes, content_type: str | None, extension: str) -> None:
    detected = detect_audio_format(header)
    if detected is None:
        raise ValueError("Audio content failed magic-byte validation")

    ext = extension.lower()
    expected_ext = _EXT_TO_FORMAT.get(ext)
    if expected_ext is None:
        raise ValueError("Unsupported audio extension")
    if expected_ext != detected:
        raise ValueError("Audio extension does not match file content")

    mime = normalize_mime(content_type)
    if mime:
        if mime not in ALLOWED_AUDIO_MIME:
            raise ValueError("Unsupported audio Content-Type")
        allowed_formats = _MIME_TO_FORMATS.get(mime, set())
        if detected not in allowed_formats:
            raise ValueError("Content-Type does not match audio content")
