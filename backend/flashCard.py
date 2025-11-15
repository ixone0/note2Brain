# backend/flashcard.py
from fastapi import APIRouter, Depends, HTTPException, Body
from db import get_prisma
import requests
import json
import os
import random
import time

router = APIRouter()

TYPHOON_API_KEY = os.getenv("TYPHOON_API_KEY", "sk-CZSRGqZVrGBdNuGgNGUXVs1R4HWjBlBSi65nIW4oTmy4Z8EC")

def generate_flashcards(summary: str, num_questions: int = 10):
    url = "https://api.opentyphoon.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {TYPHOON_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # สร้าง random variations ต่าง ๆ
    current_time = int(time.time())
    random_seed = random.randint(1, 10000)
    
    # หลายแบบ prompt เพื่อสุ่ม
    prompt_styles = [
        # Style 1: Basic
        f"""
สร้าง flashcard แบบสั้น กระชับ จากข้อความนี้ ให้ครบ {num_questions} ข้อ
เน้นแนวคิดหลักและรายละเอียดสำคัญ
คำถาม: สั้น ไม่เกิน 15 คำ
คำตอบ: สั้น ไม่เกิน 20 คำ
เน้นคำศัพท์สำคัญ คำนิยาม ข้อเท็จจริงหลัก
Random seed: {random_seed}

ข้อความ: {summary}
""",
        # Style 2: Application focused  
        f"""

สร้าง flashcard เน้นการประยุกต์ใช้สั้นๆ จำนวน {num_questions} ข้อ
คำถาม: ถาม 1 ประเด็น ไม่เกิน 10 คำ
คำตอบ: ตอบสั้น ๆ ไม่เกิน 15 คำ
เน้น: อะไร ใคร เมื่อไหร่ ที่ไหน ทำไม
ถามเกี่ยวกับการนำไปใช้จริง ตัวอย่าง และการแก้ปัญหา
Variation: {current_time % 100}

เนื้อหา: {summary}
""",
        # Style 3: Different question types
        f"""
สร้าง flashcard เน้นคำศัพท์และคำนิยาม {num_questions} ข้อ
รูปแบบ: คำถาม = คำศัพท์หรือแนวคิด (สั้น)
คำตอบ = ความหมายหรือคำอธิบาย (กระชับ)
ไม่เกิน 1-2 ประโยคต่อข้อ
Timestamp: {current_time}

ข้อมูล: {summary}
""",
        # Style 4: Deep understanding
        f"""
สร้าง flashcard แบบถาม-ตอบสั้น {num_questions} ข้อที่ทดสอบความเข้าใจลึก
เน้นการวิเคราะห์ เปรียบเทียบ และอธิบายเหตุผล
คำถาม: ใช้ "อะไรคือ" "ทำไม" "อย่างไร" (สั้น)
คำตอบ: ประโยคเดียว หรือข้อความสั้น ๆ
เน้นจำง่าย ทบทวนเร็ว
Random: {random_seed + current_time}

เอกสาร: {summary}
"""
    ]
    
    # สุ่มเลือก prompt style
    selected_prompt = random.choice(prompt_styles)
    
    # สุ่ม temperature สูง
    temperature = random.uniform(0.8, 1.2)
    
    # เพิ่ม instruction แบบสุ่ม
    random_instructions = [
        "ใช้คำถาม-คำตอบสั้น ๆ กระชับ จำง่าย",
        "เน้นข้อมูลหลัก ไม่ต้องอธิบายยาว", 
        "สร้างให้ทบทวนได้เร็ว อ่านง่าย",
        "คำถามสั้น คำตอบชัด ไปถึงเป้า"
    ]
    
    final_prompt = f"""
{selected_prompt}

{random.choice(random_instructions)}

สำคัญ: 
- คำถาม: สั้น กระชับ ไม่เกิน 15 คำ
- คำตอบ: สั้น ชัดเจน ไม่เกิน 20 คำ  
- ไม่ต้องอธิบายยาว ๆ
- เน้นจุดสำคัญเท่านั้น

ตอบเป็น JSON array เท่านั้น:
[
  {{"question": "คำถามสั้น ๆ", "answer": "คำตอบสั้น ๆ"}},
  {{"question": "คำถามสั้น ๆ", "answer": "คำตอบสั้น ๆ"}},
  ...
]
"""

    payload = {
        "model": "typhoon-v2.1-12b-instruct",
        "messages": [
            {"role": "system", "content": f"คุณคือผู้ช่วยสร้าง flashcard แบบสั้น กระชับ เพื่อทบทวนเร็ว (ID: {random_seed})"},
            {"role": "user", "content": final_prompt}
        ],
        "max_tokens": 2000,  # ลดลงเพื่อให้ได้คำตอบสั้น
        "temperature": temperature,
        "top_p": random.uniform(0.8, 1.0),
        "frequency_penalty": 0.7,
        "presence_penalty": 0.6
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=90)
        if response.status_code != 200:
            raise Exception(f"Flashcard Error {response.status_code}: {response.text}")
        
        content = response.json()["choices"][0]["message"]["content"]
        # ลบ ```json และ ``` ถ้ามี
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        flashcards = json.loads(content)
        
        # ตรวจสอบจำนวนข้อ
        if len(flashcards) < num_questions:
            # เพิ่มข้อเติมถ้าไม่ครบ
            while len(flashcards) < num_questions:
                flashcards.append({
                    "question": f"Additional question {len(flashcards) + 1}",
                    "answer": "Answer from the content studied"
                })
        elif len(flashcards) > num_questions:
            # ตัดให้เหลือตามจำนวนที่ต้องการ
            flashcards = flashcards[:num_questions]
            
        return flashcards
        
    except requests.Timeout:
        raise Exception("Request timeout. Please try again.")
    except json.JSONDecodeError:
        raise Exception("Failed to parse AI response. Please try again.")
    except Exception as e:
        raise Exception(f"Error occurred: {str(e)}")

@router.post("/flashcards/generate")
async def generate_flashcards_endpoint(
    document_id: str = Body(...),
    num_questions: int = Body(10),
    force_new: bool = Body(False),  # เพิ่ม parameter นี้
    prisma = Depends(get_prisma)
):
    try:
        document = await prisma.document.find_first(
            where={"id": document_id}
        )
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if not document.summary:
            raise HTTPException(status_code=400, detail="Document summary not available. Please upload document again.")
            
        # สร้าง flashcards ตามจำนวนที่เลือก
        flashcards = generate_flashcards(document.summary, num_questions)
        
        return {
            "flashcards": flashcards, 
            "count": len(flashcards),
            "generated_at": int(time.time())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        if "API" in error_message:
            raise HTTPException(status_code=503, detail=f"AI service unavailable: {error_message}")
        elif "timeout" in error_message.lower():
            raise HTTPException(status_code=408, detail="Request timeout. Please try again.")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {error_message}")
        
import asyncio
@router.get("/flashcard")
async def get_flashcards(questions: int, user_id: int, prisma=Depends(get_prisma)):
    documents = await prisma.document.find_many(
        where={"ownerId": user_id},  # 🔑 กรองเฉพาะ document ของ user
        take=1,
        order={"createdAt": "desc"}
    )

    if not documents:
        raise HTTPException(status_code=404, detail="No document found")

    document = documents[0]
    flashcards = await asyncio.to_thread(generate_flashcards, document.summary, questions)
    return flashcards


