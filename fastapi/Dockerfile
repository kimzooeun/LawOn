# 1. 기본 Python 이미지
FROM python:3.11-slim

# 2. 시스템 의존성 설치 (Java for Konlpy + ffmpeg)
# Konlpy 구동을 위해 Java(default-jdk-headless) 필수
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        default-jdk-headless \
        ffmpeg \
        curl \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 3. 작업 디렉토리 설정
WORKDIR /app

# 4. requirements.txt 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. 애플리케이션 코드 및 모델 복사
COPY ./main.py .
COPY ./models /app/models
COPY ./models_load.py .

# 6. 서버 실행 (JAVA_HOME은 자동 인식되므로 별도 설정 불필요하나 패키지는 깔려있어야 함)
EXPOSE 8000
# 디버깅을 위해 --log-level warning은 제거했습니다.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]