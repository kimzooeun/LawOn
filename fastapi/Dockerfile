# 1. 기본 Python 이미지
FROM python:3.11-slim

# 2. 시스템 의존성 설치 (Java for Konlpy)
# 'openjdk-17-jdk-headless' 대신 'default-jdk-headless'를 사용하여 호환성 문제 해결
RUN apt-get update && \
    apt-get install -y default-jdk-headless && \
    apt-get clean && \
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

# 6. 서버 실행 (Konlpy를 위해 JAVA_HOME 설정 유지)
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]