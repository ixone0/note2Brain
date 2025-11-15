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
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null, // 'delete' | 'clear'
    targetId: null,
    targetName: null,
    loading: false,
    error: null
  });

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

  // Open modal for single-delete or clear-all
  const openConfirmModal = ({ type, targetId = null, targetName = null }) => {
    setConfirmModal({
      open: true,
      type,
      targetId,
      targetName,
      loading: false,
      error: null
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, open: false, loading: false, error: null }));
  };

  // Perform delete single item (called by modal confirm)
  const performDelete = async () => {
    if (!confirmModal.targetId) return;
    setConfirmModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userId = localStorage.getItem("userId");
      const res = await fetch(`https://note2brain-backend.onrender.com/quiz-attempt/${confirmModal.targetId}?user_id=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete quiz attempt");

      setQuizHistory(prev => prev.filter(item => item.id !== confirmModal.targetId));
      closeConfirmModal();
    } catch (error) {
      console.error("Error deleting quiz attempt:", error);
      setConfirmModal(prev => ({ ...prev, loading: false, error: "Failed to delete. Please try again." }));
    }
  };

  // Perform clear all (called by modal confirm)
  const performClearHistory = async () => {
    setConfirmModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userId = localStorage.getItem("userId");
      const res = await fetch(`https://note2brain-backend.onrender.com/quiz-attempts?user_id=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to clear quiz history");

      setQuizHistory([]);
      closeConfirmModal();
    } catch (error) {
      console.error("Error clearing quiz history:", error);
      setConfirmModal(prev => ({ ...prev, loading: false, error: "Failed to clear. Please try again." }));
    }
  };

  // Old handlers now only open modal
  const handleDeleteItem = (itemId, itemName) => {
    openConfirmModal({ type: 'delete', targetId: itemId, targetName: itemName });
  };

  const handleClearHistory = () => {
    openConfirmModal({ type: 'clear' });
  };

  const handleRetryQuiz = (quizId, documentId) => {
    navigate(`/quiz/${quizId}`, {
      state: { 
        isRetry: true,
        documentId: documentId
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
                  onClick={() => handleRetryQuiz(item.quizId, item.quiz.document.id)}
                >
                  <RotateCw size={16} /> Retry
                </button>
                <button 
                  className="history-action-btn delete-btn" 
                  onClick={() => handleDeleteItem(item.id, item.quiz.document.filename)}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </footer>
            </div>
          );
        })}
      </main>

      {/* ===== Confirmation Modal (reuses style from your logout example) ===== */}
      {confirmModal.open && (
        <div className="confirm-modal-overlay" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <h3>
              {confirmModal.type === 'delete' ? 'Confirm Delete' : 'Clear All History'}
            </h3>
            <p>
              {confirmModal.type === 'delete' ? (
                <>Are you sure you want to delete this quiz attempt for <strong>"{confirmModal.targetName}"</strong>?</>
              ) : (
                <>Are you sure you want to clear <strong>all</strong> quiz history? This cannot be undone.</>
              )}
            </p>

            {confirmModal.error && (
              <p style={{ color: '#f87171', marginBottom: 12 }}>{confirmModal.error}</p>
            )}

            <div className="logout-modal-buttons" style={{ marginTop: 8 }}>
              <button
                className="logout-cancel"
                onClick={closeConfirmModal}
                disabled={confirmModal.loading}
                aria-disabled={confirmModal.loading}
              >
                Cancel
              </button>
              <button
                className="logout-confirm"
                onClick={confirmModal.type === 'delete' ? performDelete : performClearHistory}
                disabled={confirmModal.loading}
                aria-disabled={confirmModal.loading}
              >
                {confirmModal.loading ? 'Working...' : (confirmModal.type === 'delete' ? 'Delete' : 'Clear All')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
