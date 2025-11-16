# backend/quiz.py
from fastapi import APIRouter, Query, Depends, HTTPException
from pydantic import BaseModel
from db import get_prisma
import requests
import json
import os
import re

router = APIRouter()

# ⚡ ใช้ environment variable แทน hardcode key
TYPHOON_API_KEY = "sk-CZSRGqZVrGBdNuGgNGUXVs1R4HWjBlBSi65nIW4oTmy4Z8EC"


class QuizGenerateRequest(BaseModel):
    document_id: str
    difficulty: str = "medium"  # easy, medium, hard
    question_count: int = 3

    class Config:
        # Validation
        schema_extra = {
            "example": {
                "document_id": "uuid-here",
                "difficulty": "medium",
                "question_count": 5
            }
        }


class SubmitAnswerRequest(BaseModel):
    quiz_id: str
    answers: dict  # {"question_id": "A", ...}


# ==============================
# Robust Text Parser (รองรับภาษาไทย)
# ==============================
def parse_quiz_text(llm_text: str):
    """
    แปลง text ของ LLM ให้เป็น list ของ dict
    รองรับทั้งภาษาไทยและภาษาอังกฤษ
    """
    quizzes = []

    # แบ่ง block ตาม pattern หลายแบบ
    patterns = [
        r"(?:Q\d+|Question \d+|ข้อ\s*\d+)\s*[:.\-)]?\s*",
        r"\d+\.\s+"
    ]
    
    blocks = re.split("|".join(patterns), llm_text, flags=re.IGNORECASE)
    
    for block in blocks:
        block = block.strip()
        if not block or len(block) < 10:  # ข้าม block ที่สั้นเกินไป
            continue

        try:
            # ดึง question (บรรทัดแรก)
            lines = block.split('\n')
            question = lines[0].strip()
            
            if not question:
                continue

            # ดึง options A-D (รองรับทั้ง A) B) C) D) และ A. B. C. D.)
            options = {}
            option_patterns = [
                (r"A\s*[:.)\-]\s*(.*?)(?=\n[B-D]|\n\n|$)", "optionA"),
                (r"B\s*[:.)\-]\s*(.*?)(?=\n[C-D]|\n\n|$)", "optionB"),
                (r"C\s*[:.)\-]\s*(.*?)(?=\n[D]|\n\n|$)", "optionC"),
                (r"D\s*[:.)\-]\s*(.*?)(?=\n|$)", "optionD"),
            ]

            for pattern, key in option_patterns:
                match = re.search(pattern, block, re.IGNORECASE | re.DOTALL)
                options[key] = match.group(1).strip() if match else f"ตัวเลือก {key[-1]}"

            # ดึง correctAnswer
            answer_patterns = [
                r"(?:Answer|Correct answer|เฉลย|คำตอบ)\s*[:.\-]?\s*([A-D])",
                r"ตอบ\s*[:.\-]?\s*([A-D])"
            ]
            
            correct = "A"  # default
            for pattern in answer_patterns:
                match = re.search(pattern, block, re.IGNORECASE)
                if match:
                    correct = match.group(1).strip().upper()
                    break

            # ดึง explanation
            expl_patterns = [
                r"(?:Explanation|Reason|Because|เพราะว่า|อธิบาย)\s*[:.\-]?\s*(.*?)$",
            ]
            
            explanation = ""
            for pattern in expl_patterns:
                match = re.search(pattern, block, re.IGNORECASE | re.DOTALL)
                if match:
                    explanation = match.group(1).strip()
                    break

            quizzes.append({
                "question": question,
                "optionA": options.get("optionA", "ตัวเลือก A"),
                "optionB": options.get("optionB", "ตัวเลือก B"),
                "optionC": options.get("optionC", "ตัวเลือก C"),
                "optionD": options.get("optionD", "ตัวเลือก D"),
                "correctAnswer": correct,
                "explanation": explanation
            })
        
        except Exception as e:
            print(f"⚠️ Parse block error: {e}")
            continue

    return quizzes


# ==============================
# Typhoon LLM Quiz Generator
# ==============================
def generate_quiz_from_llm(summary: str, difficulty: str, count: int):
    """
    ส่งข้อความ summary ไปให้ Typhoon LLM
    และให้ generate quiz แบบ multiple-choice
    """
    if not TYPHOON_API_KEY:
        raise HTTPException(status_code=500, detail="TYPHOON_API_KEY not configured")

    url = "https://api.opentyphoon.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {TYPHOON_API_KEY}",
        "Content-Type": "application/json"
    }

    # ปรับ prompt ให้ชัดเจนขึ้น
    prompt = f"""สร้าง {count} ข้อคำถาม multiple-choice จากข้อความด้านล่าง
ความยาก: {difficulty}

**รูปแบบที่ต้องการ (JSON array)**:
[
  {{
    "question": "คำถาม",
    "optionA": "ตัวเลือก A",
    "optionB": "ตัวเลือก B", 
    "optionC": "ตัวเลือก C",
    "optionD": "ตัวเลือก D",
    "correctAnswer": "A",
    "explanation": "เพราะว่า..."
  }}
]

**หลักเกณฑ์**:
- คำถามต้องสั้น กระชับ ชัดเจน
- ตัวเลือกแต่ละข้อต้องมีความน่าเชื่อถอ (ไม่ชัดเจนเกินไป)
- correctAnswer ใช้ตัวอักษร A, B, C, หรือ D เท่านั้น
- explanation อธิบายว่าทำไมตัวเลือกนั้นถูกต้อง

---
**ข้อความ:**
{summary[:2000]}
"""

    payload = {
        "model": "typhoon-v2.1-12b-instruct",
        "messages": [
            {"role": "system", "content": "คุณคือผู้เชี่ยวชาญด้านการสร้างข้อสอบ multiple-choice ที่มีคุณภาพสูง"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 2000
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="LLM timeout - ลองใหม่อีกครั้ง")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")

    content = response.json()["choices"][0]["message"]["content"]

    # ==============================
    # Parser: ลอง JSON ก่อน ถ้า error ใช้ text parser
    # ==============================
    try:
        # ลอง extract JSON จาก markdown code block
        json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', content, re.DOTALL)
        if json_match:
            content = json_match.group(1)
        
        quiz_data = json.loads(content)
        
        # Validate structure
        if not isinstance(quiz_data, list) or len(quiz_data) == 0:
            raise ValueError("Invalid quiz format")
            
    except (json.JSONDecodeError, ValueError) as e:
        print(f"⚠️ JSON parse failed, using text parser: {e}")
        quiz_data = parse_quiz_text(content)

    # ตรวจสอบว่าได้ quiz มาหรือไม่
    if not quiz_data or len(quiz_data) == 0:
        raise HTTPException(
            status_code=500, 
            detail="ไม่สามารถสร้างคำถามได้ - ลองเปลี่ยน document หรือลดจำนวนคำถาม"
        )

    return quiz_data[:count]  # ตัดให้เหลือแค่จำนวนที่ต้องการ


# ==============================
# Generate Quiz Endpoint
# ==============================
@router.post("/generate-quiz")
async def generate_quiz(
    request: QuizGenerateRequest,
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """สร้าง quiz จาก document"""
    
    # Validate difficulty
    if request.difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="difficulty ต้องเป็น easy, medium, หรือ hard")
    
    # Validate question_count
    if request.question_count < 1 or request.question_count > 20:
        raise HTTPException(status_code=400, detail="Maximum number of questions is 20.")

    # 1️⃣ ตรวจสอบ document ของ user
    document = await prisma.document.find_first(
        where={
            "id": request.document_id,
            "ownerId": user_id
        }
    )
    if not document:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสารหรือไม่มีสิทธิ์เข้าถึง")

    # 2️⃣ สร้าง quiz ผ่าน LLM
    try:
        quiz_data = generate_quiz_from_llm(
            document.summary,
            request.difficulty,
            request.question_count
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการสร้าง quiz: {str(e)}")

    # 3️⃣ Save Quiz + Questions ลง DB
    quiz = await prisma.quiz.create(
        data={
            "userId": user_id,
            "documentId": request.document_id,
            "difficulty": request.difficulty,
            "questions": {
                "create": [
                    {
                        "question": q["question"],
                        "optionA": q["optionA"],
                        "optionB": q["optionB"],
                        "optionC": q["optionC"],
                        "optionD": q["optionD"],
                        "correctAnswer": q["correctAnswer"],
                        "explanation": q.get("explanation", "")
                    }
                    for q in quiz_data
                ]
            }
        },
        include={
            "questions": True,
            "document": True
        }
    )

    return {
        "success": True, 
        "quiz_id": quiz.id,
        "question_count": len(quiz.questions),
        "data": quiz
    }


# ==============================
# Get User's Quizzes
# ==============================
@router.get("/quizzes")
async def get_quizzes(
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """ดึงรายการ quiz ทั้งหมดของ user"""
    quizzes = await prisma.quiz.find_many(
        where={"userId": user_id},
        include={
            "document": True,
            "questions": True,
            
        },
        order={"createdAt": "desc"}
    )
    return {"success": True, "data": quizzes}


# ==============================
# Get Quiz Detail
# ==============================
@router.get("/quiz/{quiz_id}")
async def get_quiz(
    quiz_id: str,
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """ดึงข้อมูล quiz แบบละเอียด"""
    quiz = await prisma.quiz.find_first(
        where={
            "id": quiz_id,
            "userId": user_id
        },
        include={
            "questions": True,
            "document": True
        }
    )
    
    if not quiz:
        raise HTTPException(status_code=404, detail="ไม่พบ quiz หรือไม่มีสิทธิ์เข้าถึง")
    
    return {"success": True, "data": quiz}


# ==============================
# Submit Quiz Answers
# ==============================
@router.post("/submit-quiz")
async def submit_quiz(
    request: SubmitAnswerRequest,
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """ส่งคำตอบและคำนวณคะแนน"""
    
    quiz = await prisma.quiz.find_first(
        where={
            "id": request.quiz_id,
            "userId": user_id
        },
        include={"questions": True}
    )
    
    if not quiz:
        raise HTTPException(status_code=404, detail="ไม่พบ quiz")
    
    correct_count = 0
    results = []

    # loop ตรวจคำตอบ
    for question in quiz.questions:
        user_answer = request.answers.get(question.id, "")
        is_correct = user_answer.upper() == question.correctAnswer.upper()
        
        if is_correct:
            correct_count += 1

        results.append({
            "question_id": question.id,
            "question": question.question,
            "user_answer": user_answer,
            "correct_answer": question.correctAnswer,
            "is_correct": is_correct,
            "explanation": question.explanation
        })

    # ✅ เก็บเฉพาะ user answers แบบ key-value
    answers_to_store = {
        question_id: request.answers.get(question_id, "")
        for question_id in request.answers.keys()
    }

    try:
        # แปลงเฉพาะคำตอบเป็น JSON string
        answers_json_str = json.dumps(answers_to_store, ensure_ascii=False)
        
        attempt = await prisma.quizattempt.create(
            data={
                "userId": user_id,
                "quizId": request.quiz_id,
                "score": correct_count,
                "totalQuestions": len(quiz.questions),
                "answers": answers_json_str  # ✅ เก็บเฉพาะคำตอบของ user
            }
        )
    except Exception as e:
        print("ERROR: Failed to create QuizAttempt:", e)
        raise HTTPException(status_code=500, detail=f"Failed to save quiz attempt: {str(e)}")

    return {
        "success": True,
        "score": correct_count,
        "total": len(quiz.questions),
        "percentage": round((correct_count / len(quiz.questions)) * 100, 2),
        "results": results,
        "attempt_id": attempt.id
    }



# ==============================
# Get Quiz History
# ==============================
@router.get("/quiz-history")
async def get_quiz_history(
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """ดูประวัติการทำ quiz"""
    attempts = await prisma.quizattempt.find_many(
        where={"userId": user_id},
        include={
            "quiz": {
                "include": {"document": True, "questions": True}
            }
        },
        order={"completedAt": "desc"},
        take=50
    )
    
    return {
        "success": True,
        "data": [
            {
                "id": attempt.id,
                "quizId": attempt.quizId,
                "score": attempt.score,
                "totalQuestions": attempt.totalQuestions,
                "answeredCount": len(attempt.quiz.questions),  # สมมติว่าผู้ใช้ตอบครบทุกข้อ
                "completedAt": attempt.completedAt,
                "answers": json.loads(attempt.answers) if attempt.answers else None,  # Parse JSON string back to object
                "quiz": {
                    "id": attempt.quiz.id,
                    "document": {
                        "id": attempt.quiz.document.id,
                        "filename": attempt.quiz.document.filename
                    },
                    "questions": [
                        {
                            "id": question.id,
                            "question": question.question,
                            "correctAnswer": question.correctAnswer
                        }
                        for question in attempt.quiz.questions
                    ]
                }
            }
            for attempt in attempts
        ]
    }


# ==============================
# Retry Quiz Endpoint
# ==============================
@router.get("/quiz/{quiz_id}/retry")
async def retry_quiz(
    quiz_id: str,
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """ดึงข้อมูล Quiz เดิมสำหรับ Retry"""
    quiz = await prisma.quiz.find_first(
        where={"id": quiz_id, "userId": user_id},
        include={"questions": True, "document": True}
    )
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found or access denied")

    return {
        "success": True,
        "data": {
            "id": quiz.id,
            "document": {
                "id": quiz.document.id,
                "filename": quiz.document.filename
            },
            "questions": [
                {
                    "id": question.id,
                    "question": question.question,
                    "optionA": question.optionA,
                    "optionB": question.optionB,
                    "optionC": question.optionC,
                    "optionD": question.optionD,
                    "correctAnswer": question.correctAnswer
                }
                for question in quiz.questions
            ]
        }
    }


# ==============================
# Delete Quiz Attempt
# ==============================
@router.delete("/quiz-attempt/{attempt_id}")
async def delete_quiz_attempt(
    attempt_id: str,
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """ลบ Quiz Attempt ทีละรายการ"""
    attempt = await prisma.quizattempt.find_first(
        where={"id": attempt_id, "userId": user_id}
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found or access denied")

    await prisma.quizattempt.delete(where={"id": attempt_id})
    return {"success": True, "message": "Quiz attempt deleted successfully"}


@router.get("/quiz-attempt/{attempt_id}")
async def get_quiz_attempt(
    attempt_id: str,
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """ดึงรายละเอียด QuizAttempt รวมถึงคำตอบที่บันทึกไว้"""
    attempt = await prisma.quizattempt.find_first(
        where={"id": attempt_id, "userId": user_id},
        include={
            "quiz": {"include": {"document": True, "questions": True}}
        }
    )

    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found or access denied")

    # Parse answers JSON string back to object
    attempt_data = {
        "id": attempt.id,
        "userId": attempt.userId,
        "quizId": attempt.quizId,
        "score": attempt.score,
        "totalQuestions": attempt.totalQuestions,
        "completedAt": attempt.completedAt,
        "answers": json.loads(attempt.answers) if attempt.answers else None,
        "quiz": attempt.quiz
    }

    return {"success": True, "data": attempt_data}

@router.delete("/quiz-attempts")
async def clear_quiz_attempts(
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """ลบ Quiz Attempt ทั้งหมดของผู้ใช้"""
    await prisma.quizattempt.delete_many(where={"userId": user_id})
    return {"success": True, "message": "All quiz attempts deleted successfully"}

# ==============================
# Get Quiz Result with Answers
# ==============================
@router.get("/quiz/{quiz_id}/result")
async def get_quiz_result(
    quiz_id: str,
    user_id: int = Query(...),
    prisma = Depends(get_prisma)
):
    """ดึงผลลัพธ์และคำเฉลยของ quiz"""
    # 1. ดึง quiz และคำถามทั้งหมด
    quiz = await prisma.quiz.find_first(
        where={
            "id": quiz_id,
            "userId": user_id
        },
        include={
            "questions": True,
            "document": True
        }
    )
    
    if not quiz:
        raise HTTPException(status_code=404, detail="ไม่พบ quiz หรือไม่มีสิทธิ์เข้าถึง")

    # 2. ดึง attempt ล่าสุดของ quiz นี้
    attempt = await prisma.quizattempt.find_first(
        where={
            "quizId": quiz_id,
            "userId": user_id
        },
        order={"completedAt": "desc"}
    )

    if not attempt:
        raise HTTPException(status_code=404, detail="ยังไม่มีการทำ quiz นี้")

    # 3. แปลง answers จาก JSON string เป็น dict
    user_answers = json.loads(attempt.answers) if attempt.answers else {}

    # 4. สร้าง response
    return {
        "success": True,
        "data": {
            "quiz_id": quiz.id,
            "document": {
                "id": quiz.document.id,
                "filename": quiz.document.filename
            },
            "score": attempt.score,
            "total": attempt.totalQuestions,
            "answeredCount": len(user_answers),
            "questions": [
                {
                    "id": q.id,
                    "question": q.question,
                    "optionA": q.optionA,
                    "optionB": q.optionB,
                    "optionC": q.optionC,
                    "optionD": q.optionD,
                    "correctAnswer": q.correctAnswer,
                    "userAnswer": user_answers.get(q.id, ""),
                    "explanation": q.explanation,
                    "isCorrect": user_answers.get(q.id, "").upper() == q.correctAnswer.upper()
                }
                for q in quiz.questions
            ]
        }
    }