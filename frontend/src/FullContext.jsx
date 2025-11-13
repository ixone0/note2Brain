import React, { useState, useEffect, useMemo } from 'react'; // <--- เพิ่ม useMemo
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import './FullContext.css'; // <--- เราจะสร้าง CSS นี้ในขั้นตอนถัดไป

export default function FullContext() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await fetch(`https://note2brain-backend.onrender.com/document/${id}`);
        if (!res.ok) {
          throw new Error('Document not found');
        }
        const data = await res.json();
        setDoc(data);
      } catch (err) {
        console.error("Error fetching document:", err);
        setDoc(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  // ✨ [เพิ่ม] สร้างฟังก์ชันกรอง HTML โดยใช้ useMemo
  const cleanedText = useMemo(() => {
    if (!doc || !doc.fullText) {
      return "Full text is not available.";
    }
    
    try {
      // สร้าง div ชั่วคราวในหน่วยความจำเพื่อแปลง HTML เป็น Text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = doc.fullText;
      return tempDiv.textContent || tempDiv.innerText || "";
    } catch (e) {
      console.error("Error parsing fullText:", e);
      return doc.fullText; // ถ้าแปลงไม่ได้ ก็แสดงแบบเดิม
    }
  }, [doc]);

  if (loading) {
    // ✨ [แก้ไข] ใช้ Loading Spinner จากธีมหลัก (Document.css ต้องถูก import ใน index.js หรือ App.jsx)
    return (
      <div className="generating-overlay">
        <div className="generating-container">
          <div className="generating-spinner">
            <ArrowLeft size={50} className="spinner-icon" /> {/* หรือใช้ FileText */}
          </div>
          <h2 className="generating-text">Loading Document</h2>
        </div>
      </div>
    );
  }

  if (!doc) {
    return <div className="context-container"><div>Document not found.</div></div>;
  }

  return (
    <div className="context-container">
      <header className="context-header">
        <button className="context-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="context-title">{doc.filename}</h1>
      </header>

      <main className="context-main">
        <div className="context-content-box">
          <pre className="context-text">
            {/* ✨ [แก้ไข] ใช้ cleanedText ที่กรองแล้ว */}
            {cleanedText}
          </pre>
        </div>
      </main>
    </div>
  );
}