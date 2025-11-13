# ใช้ Python 3.11 slim image
FROM python:3.11-slim

# ตั้งค่า working directory
WORKDIR /app

# ติดตั้ง dependencies ของระบบ (สำหรับ psycopg2)
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# คัดลอก requirements.txt และติดตั้ง Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# คัดลอกโค้ด backend ทั้งหมด
COPY . .

# สำหรับ Prisma - generate client
RUN prisma generate

# เปิด port 8000
EXPOSE 8000

# รันแอป FastAPI ด้วย Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
