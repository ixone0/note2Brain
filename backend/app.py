# backend/app.py
from fastapi import FastAPI, UploadFile, File, Query, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import json
from PyPDF2 import PdfReader
import io
from db import get_prisma
from quiz import router as quiz_router
from flashCard import router as flashcard_router
from main import router as main_router

app = FastAPI()

# ✅ รวม router จากโมดูลอื่น
app.include_router(main_router)
app.include_router(quiz_router)
app.include_router(flashcard_router)

# ✅ ตั้งค่า CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TYPHOON_API_KEY = "sk-CZSRGqZVrGBdNuGgNGUXVs1R4HWjBlBSi65nIW4oTmy4Z8EC"


# 🧠 OCR แบบทั้งไฟล์ครั้งเดียว (รุ่นแรก)
def typhoon_ocr(file: UploadFile):
    url = "https://api.opentyphoon.ai/v1/ocr"

    file.file.seek(0)
    file_bytes = file.file.read()
    pdf_stream = io.BytesIO(file_bytes)

    reader = PdfReader(pdf_stream)
    num_pages = len(reader.pages)
    pages = list(range(1, num_pages + 1))

    pdf_stream.seek(0)
    files = {"file": (file.filename, pdf_stream, file.content_type)}

    params = {
        "model": "typhoon-ocr-preview",
        "task_type": "default",
        "max_tokens": 16000,
        "temperature": 0.1,
        "top_p": 0.6,
        "repetition_penalty": 1.2,
        "pages": pages
    }
    data = {"params": json.dumps(params),
             "pages": json.dumps(pages)
            }
    headers = {"Authorization": f"Bearer {TYPHOON_API_KEY}"}

    response = requests.post(url, files=files, data=data, headers=headers)
    if response.status_code != 200:
        raise Exception(f"OCR Error {response.status_code}: {response.text}")

    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # ✅ รวมข้อความจากทุกหน้า
    ocr_texts = []
    for item in result.get("results", []):
        try:
            content_str = item["message"]["choices"][0]["message"]["content"]
            try:
                content_json = json.loads(content_str)
                page_text = content_json.get("natural_text", "")
            except json.JSONDecodeError:
                page_text = content_str

            if page_text:
                ocr_texts.append(page_text.strip())
        except Exception as inner_e:
            print("Parse page error:", inner_e)

    return "\n".join(ocr_texts).strip()
    


# ✨ Summarization ด้วย Typhoon LLM
def typhoon_summary(text: str):
    url = "https://api.opentyphoon.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {TYPHOON_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "typhoon-v2.1-12b-instruct",
        "messages": [
            {"role": "system", "content": "สรุปข้อความให้อ่านง่าย กระชับ"},
            {"role": "user", "content": text}
        ]
    }

    response = requests.post(url, headers=headers, json=payload)
    if response.status_code != 200:
        raise Exception(f"Summary Error {response.status_code}: {response.text}")

    return response.json()["choices"][0]["message"]["content"]


# 📤 อัปโหลดไฟล์ → OCR → สรุป → บันทึกลงฐานข้อมูล
@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: int = Query(...),
    prisma=Depends(get_prisma)
):
    # 1️⃣ OCR
    ocr_text = typhoon_ocr(file)
    if not ocr_text:
        return {"error": "OCR ไม่สามารถอ่านไฟล์ได้"}

    # 2️⃣ สรุปข้อความ
    summary = typhoon_summary(ocr_text)

    # 3️⃣ บันทึกลงฐานข้อมูล
    document = await prisma.document.create(
        data={
            "filename": file.filename,
            "fullText": ocr_text,
            "summary": summary,
            "ownerId": user_id
        }
    )

    return {
        "filename": file.filename,
        "ocr_text": ocr_text,
        "summary": summary
    }


# 📜 ดึงรายการเอกสารของ user
@app.get("/documents")
async def get_documents(user_id: int, prisma=Depends(get_prisma)):
    docs = await prisma.document.find_many(
        where={"ownerId": user_id},
        order={"createdAt": "desc"}
    )
    return docs


# 🔍 ดึงเอกสารตาม id
@app.get("/document/{id}")
async def get_document(id: str, prisma=Depends(get_prisma)):
    doc = await prisma.document.find_unique(where={"id": id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
