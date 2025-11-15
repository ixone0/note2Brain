import React, { useState, useRef, useEffect  } from 'react';
import './UploadOCR.css';
import { useNavigate } from "react-router-dom";
import "./Document.css";

export default function UploadOCR() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);


  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError(null);
    setResult(null);
    if (selectedFile?.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      setFile(null);
      setError("Please select a PDF file.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error("User not logged in");
      }

      const response = await fetch(`https://note2brain-backend.onrender.com/upload?user_id=${userId}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // สมมุติ backend ส่ง error message เช่น { error: "PDF must not exceed 50 pages." }
        setError(data.error || data.detail || 'OCR process failed');
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const renderAnimatedText = (text) => {
    return text.split('\n').map((line, index) => (
      <div
        key={index}
        className="summary-line"
        style={{
          animationDelay: `${index * 0.1}s`
        }}
      >
        {line.trim() || '\u00A0'}
      </div>
    ));
  };

  useEffect(() => {
    // ปิด animation ชั่วคราว 50ms
    document.body.classList.add("no-animation");
    setTimeout(() => {
      document.body.classList.remove("no-animation");
    }, 50);
  }, []);

  return (
    <div className="upload-container page-transition">
      <div className="upload-card">
        <div className="upload-header">
          <img src="/logo.png" alt="logo" className="upload-logo" />
        </div>
        <h1 className="upload-title">
          PDF EXTRACTOR
        </h1>

        {/* แจ้งเตือน error */}
        {error && (
          <div className="upload-error-notification">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="upload-form">
          <label 
            htmlFor="file-input"
            className={`file-upload-area ${file ? 'has-file' : ''} ${loading ? 'animate-border' : ''}`}
            data-file-name={file ? file.name : ''}  
          >

            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="file-input"
              ref={fileInputRef}
              onClick={(e) => { 
                e.currentTarget.value = null
              }}
            />
          </label>

          <button
              type="submit"
              disabled={!file || loading}
              className={`submit-button ${!file ? 'disabled' : ''} ${loading ? 'processing' : ''}`}
            >
              {loading ? 'Processing...' : 'Extract Text'}
          </button>

        </form>

        {result && (
          <div className="result-section">
            <div className="summary-section">
              <h2 className="summary-title">Summary:</h2>
              <div className="summary-content">
                <div className="summary-text">
                  {renderAnimatedText(result.summary)}
                </div>
              </div>
            </div>
            {/* ✨ ปุ่มไปยัง Document */}
            {result.document_id && (
              <button
                className="submit-button"
                style={{ marginTop: "1.5rem" }}
                onClick={() => navigate(`/document/${result.document_id}`)}
              >
                Go to Document
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}