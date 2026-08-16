FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt

RUN python -m pip install --no-cache-dir -r /app/requirements.txt

COPY . .

CMD ["sh", "-c", "python backend/seed.py && cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
