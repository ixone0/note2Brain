#!/usr/bin/env bash
set -eux

prisma generate
prisma py fetch

# ให้ execute bit กับ binary ที่ดาวน์โหลดมา (cache path)
find /opt/render/.cache/prisma-python -type f -name 'prisma-query-engine*' -exec chmod +x {} \;
# ให้ execute bit กับไฟล์ใน project root ถ้ามี
find "$(pwd)" -maxdepth 2 -type f -name 'prisma-query-engine*' -exec chmod +x {} \; || true

uvicorn app:app --host 0.0.0.0 --port $PORT
