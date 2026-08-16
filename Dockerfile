FROM python:3.11-slim

WORKDIR /app

# Copy backend dependencies
COPY backend/requirements.txt /app/requirements.txt

# Install dependencies
RUN python -m pip install --no-cache-dir -r /app/requirements.txt

# Copy the entire project
COPY . .

# Seed database and start FastAPI
CMD ["sh", "-c", "python backend/seed.py && cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
