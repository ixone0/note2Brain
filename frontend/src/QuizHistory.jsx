import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Trash2, 
  RotateCw, 
  View 
} from 'lucide-react';

import './QuizHistory.css'; 

export default function QuizHistory() {
  const navigate = useNavigate();
  const [quizHistory, setQuizHistory] = useState([]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");    
    if (!userId) {
      navigate("/login");
      return;
    }

    const fetchQuizHistory = async () => {
      try {
        const res = await fetch(`https://note2brain-backend.onrender.com/quiz-history?user_id=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch quiz history");
        const data = await res.json();
        setQuizHistory(data.data || []);
      } catch (error) {
        console.error("Error fetching quiz history:", error);
        setQuizHistory([]);
      }
    };

    fetchQuizHistory();
  }, [navigate]);

  const handleDeleteItem = async (itemId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this quiz?");
    if (!confirmDelete) return;

    try {
      const userId = localStorage.getItem("userId");
      const res = await fetch(`https://note2brain-backend.onrender.com/quiz-attempt/${itemId}?user_id=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete quiz attempt");

      const updatedHistory = quizHistory.filter(item => item.id !== itemId);
      setQuizHistory(updatedHistory);
    } catch (error) {
      console.error("Error deleting quiz attempt:", error);
      alert("Failed to delete quiz attempt. Please try again.");
    }
  };

  const handleClearHistory = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear all quiz history?");
    if (!confirmClear) return;

    try {
      const userId = localStorage.getItem("userId");
      const res = await fetch(`https://note2brain-backend.onrender.com/quiz-attempts?user_id=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to clear quiz history");

      setQuizHistory([]);
    } catch (error) {
      console.error("Error clearing quiz history:", error);
      alert("Failed to clear quiz history. Please try again.");
    }
  };

  const handleRetryQuiz = (quizId, documentId) => {  // เพิ่ม documentId parameter
    navigate(`/quiz/${quizId}`, {
      state: { 
        isRetry: true,
        documentId: documentId  // เพิ่ม documentId ใน state
      }
    });
  };

  const handleViewResult = (quizItem) => {
    const resultData = {
      score: quizItem.score,
      totalQuestions: quizItem.totalQuestions,
      documentName: quizItem.quiz.document.filename,
      documentId: quizItem.quiz.document.id,
      answeredCount: quizItem.answeredCount || quizItem.totalQuestions,
      results: quizItem.quiz.questions.map((q) => ({
        question: q.question,
        correctAnswer: q.correctAnswer
      }))
    };
    navigate(`/quiz/${quizItem.quizId}/result`, { state: resultData });
  };

  const getGrade = (score) => {
    if (score >= 90) return { text: 'A+', color: '#059669' };
    if (score >= 80) return { text: 'A', color: '#059669' };
    if (score >= 70) return { text: 'B+', color: '#0284c7' };
    if (score >= 60) return { text: 'B', color: '#0284c7' };
    if (score >= 50) return { text: 'C', color: '#d97706' };
    return { text: 'F', color: '#dc2626' };
  };

  const getScoreBadgeClass = (percentage) => {
    if (percentage === 100) return 'perfect';
    if (percentage < 50) return 'failed';
    return 'passing';
  };

  if (quizHistory.length === 0) {
    return (
      <div className="history-container">
        <div className="empty-state">
          <History size={64} className="empty-icon" />
          <h2 className="empty-title">No Quiz History</h2>
          <p className="empty-description">
            It looks like you haven't taken any quizzes yet. Start learning and test your knowledge!
          </p>
          <button className="empty-btn" onClick={() => navigate('/home')}>
            Explore Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <header className="history-header">
        <h1 className="history-title">Quiz History</h1>
        <button className="clear-history-btn" onClick={handleClearHistory}>
          <Trash2 size={16} />
          Clear All History
        </button>
      </header>

      <main className="history-list">
        {quizHistory.map((item, index) => {
          const percentage = Math.round((item.score / item.totalQuestions) * 100);
          const grade = getGrade(percentage);
          const correctAnswers = item.score;
          const incorrectAnswers = item.totalQuestions - item.score;

          return (
            <div 
              key={item.id} 
              className="history-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="history-card-header">
                <div className="history-info">
                  <h3 className="history-doc-name">{item.quiz.document.filename}</h3>
                  <p className="history-date">{new Date(item.completedAt).toLocaleString()}</p>
                </div>
                <div className={`history-score-badge ${getScoreBadgeClass(percentage)}`}>
                  {percentage}%
                </div>
              </div>
              <div className="history-card-body">
                <div className="history-stat-row">
                  <div className="history-stat">
                    <CheckCircle2 size={20} color="#10b981" />
                    <span className="stat-text">Correct: {correctAnswers}</span>
                  </div>
                  <div className="history-stat">
                    <XCircle size={20} color="#ef4444" />
                    <span className="stat-text">Incorrect: {incorrectAnswers}</span>
                  </div>
                  <div className="history-stat">
                    <FileText size={20} color="#8892b0" />
                    <span className="stat-text">Total: {item.totalQuestions}</span>
                  </div>
                  <div className="history-grade" style={{ color: grade.color }}>
                    Grade: {grade.text}
                  </div>
                </div>
                <div className="history-progress-bar">
                  <div
                    className="history-progress-fill"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
              <footer className="history-card-footer">
                <button className="history-action-btn view-btn" onClick={() => handleViewResult(item)}>
                  <View size={16} /> View
                </button>
                <button 
                  className="retry-btn history-action-btn"
                  onClick={() => handleRetryQuiz(item.quizId, item.quiz.document.id)}  // ส่ง documentId ด้วย
                >
                  <RotateCw size={16} /> Retry
                </button>
                <button className="history-action-btn delete-btn" onClick={() => handleDeleteItem(item.id)}>
                  <Trash2 size={16} /> Delete
                </button>
              </footer>
            </div>
          );
        })}
      </main>
    </div>
  );
}

