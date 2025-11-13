import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Layers, Lightbulb } from 'lucide-react';
import "./Document.css";
import QuizGenerate from "./QuizGenerate.jsx";
import FlashcardGenerate from "./FlashcardGenerate.jsx";

export default function Document() {
  const { id: documentId } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [isGeneratingFlashcard, setIsGeneratingFlashcard] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await fetch(`https://note2brain-backend.onrender.com/document/${documentId}`);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: "Document not found." }));
          throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
        }

        const documentData = await res.json();
        if (documentData && documentData.id) {
          setDoc(documentData);
        } else {
          throw new Error("Received invalid document data structure from backend.");
        }

      } catch (err) {
        console.error("Error fetching document:", err);
        setDoc(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [documentId]);

  const handleCreateQuiz = async ({ difficulty, numQuestions }) => {
    const userId = localStorage.getItem("userId");
    if (!userId || !documentId) {
      alert("Error: Missing user or document information.");
      return;
    }

    setIsGeneratingQuiz(true);
    setIsModalOpen(false);

    try {
      const response = await fetch(`http://localhost:8000/generate-quiz?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          difficulty: difficulty.toLowerCase(),
          question_count: parseInt(numQuestions, 10),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to generate quiz." }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.quiz_id) {
        console.log("UserID BEFORE navigate:", localStorage.getItem("userId"));
        navigate(`/quiz/${result.quiz_id}`);
      } else {
        throw new Error(result.detail || 'Quiz ID not received from backend');
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      alert(`Error generating quiz: ${error.message}\nPlease try again.`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleCreateFlashcard = async ({ numQuestions }) => {
    setIsGeneratingFlashcard(true);
    setIsFlashcardModalOpen(false);

    try {
      navigate(`/document/${documentId}/flashcard?questions=${numQuestions}`);
    } catch (error) {
      console.error("Error setting up flashcard:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsGeneratingFlashcard(false);
    }
  };

  if (loading) {
    return (
      <div className="home-root">
        <div>Loading Document...</div>
      </div>
    );
  }

  // --- 1. Animation สำหรับ Quiz ---
  if (isGeneratingQuiz) {
    return (
      <div className="generating-overlay">
        <div className="generating-container">
          <div className="generating-spinner">
            <FileText size={50} className="spinner-icon" />
          </div>
          <h2 className="generating-text">Generating Quiz</h2>
          <p className="generating-subtext">
            Creating personalized questions based on your document content.
            This may take a moment...
          </p>
        </div>
      </div>
    );
  }

  // --- 2. Animation สำหรับ Flashcard (เหมือนกันเป๊ะ) ---
  if (isGeneratingFlashcard) {
    return (
      <div className="generating-overlay">
        <div className="generating-container">
          <div className="generating-spinner">
            <FileText size={50} className="spinner-icon" />
          </div>
          <h2 className="generating-text">Generating Flashcards</h2>
          <p className="generating-subtext">
            Creating study cards from your document.
            This may take a moment...
          </p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="home-root">
        <div>Document not found. Please go back and try another document.</div>
      </div>
    );
  }

  return (
    <div className="home-root page-transition">
      <header className="home-header" style={{ position: "relative" }}>
        <img src="/logo.png" alt="logo" className="home-logo" />
        <button className="back-btn" onClick={() => navigate("/home")}>
          Home
        </button>
      </header>
      <hr className="home-divider" />
      <main className="home-main">
        <div className="home-section-title">{doc.filename}</div>
        <div className="summary-section">
          <h2 className="summary-title">Summary:</h2>
          <div className="summary-content">
            <p className="summary-text">{doc.summary || "No summary available."}</p>
          </div>
        </div>
        <div className="button-container">
          <button
            className="simple-button"
            onClick={() => navigate(`/document/${documentId}/context`)}
          >
            <FileText size={16} /> Full Context
          </button>
          <button
            className="simple-button"
            onClick={() => setIsFlashcardModalOpen(true)}
          >
            <Layers size={16} /> Flash Card
          </button>
          <button
            className="simple-button"
            onClick={() => setIsModalOpen(true)}
          >
            <Lightbulb size={16} /> Quiz
          </button>
        </div>
      </main>
      <QuizGenerate
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateQuiz={handleCreateQuiz}
        documentName={doc.filename}
      />
      <FlashcardGenerate
        isOpen={isFlashcardModalOpen}
        onClose={() => setIsFlashcardModalOpen(false)}
        onCreateFlashcard={handleCreateFlashcard}
        documentName={doc.filename}
      />
    </div>
  );
}