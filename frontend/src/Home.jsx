import React, { useEffect, useState } from "react";
import { createPortal } from 'react-dom'; // <--- 1. Import createPortal
import "./Home.css";
import { useNavigate } from "react-router-dom";
import newLogo from './favicon-512.png';

export default function Home() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocuments = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        navigate("/login");
        return;
      }
      try {
        const res = await fetch(`https://note2brain-backend.onrender.com/documents?user_id=${userId}`);
        const data = await res.json();
        setDocuments(data);
      } catch (err) {
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [navigate]);

  return (
    <>
      {/* ส่วนเนื้อหาหลัก (เหมือนเดิม) */}
      <div className="page-transition">
        <div className="home-root">
          <header className="home-header">
            <img src={newLogo} alt="logo" className="home-logo" />
          </header>
          
          <main className="home-main">
            <div className="home-title-section">
              <h1 className="home-title">My Documents</h1>
              <hr className="home-content-divider" />
            </div>

            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="home-doc-list">
                {documents.length === 0 ? (
                  <div className="home-empty">No uploaded files.</div>
                ) : (
                  documents.map((doc) => (
                    <div
                      className="home-doc-card"
                      key={doc.id}
                      onClick={() => navigate(`/document/${doc.id}`)}
                    >
                      <div className="home-doc-icon">
                        <img src="/logo.png" alt="file" className="home-doc-img" />
                      </div>
                      <div className="home-doc-name">{doc.filename}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* vvvvvvvv [แก้ไข] vvvvvvvvvv */}
      {/* 2. ใช้ createPortal "ส่ง" ปุ่มนี้ไปที่ document.body */}
      {createPortal(
        <div className="home-upload-btn-wrap">
          <button className="home-upload-btn" onClick={() => navigate("/upload")}>
            <span className="home-upload-plus">+</span>
            <span className="home-upload-text">Upload files</span>
          </button>
        </div>,
        document.body 
      )}
      {/* ^^^^^^^^^^ [แก้ไข] ^^^^^^^^^^ */}
    </>
  );
}