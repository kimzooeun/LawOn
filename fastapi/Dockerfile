FROM python:3.11-slim

WORKDIR /app


RUN pip install --upgrade pip

# RUN pip install -i https://mirror.kakao.com/pypi/simple --no-cache-dir torch==2.8.0 --timeout=1200 --retries=10

COPY requirements2.txt .
RUN pip install --no-cache-dir -r requirements2.txt --timeout=600 --retries=10



COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
