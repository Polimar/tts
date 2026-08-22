FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY run.py .

ENV TTS_HOST=0.0.0.0
ENV TTS_PORT=8765
ENV TTS_DATA_DIR=/data

EXPOSE 8765

CMD ["python", "run.py"]
