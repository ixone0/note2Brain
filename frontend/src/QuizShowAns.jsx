import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./Quiz.css";
import "./QuizShowAns.css";

export default function QuizShowAns() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate("/login");
      return;
    }

    // If the router passed result data in location.state, use it (fast path).
    const stateData = location.state;
    if (stateData && (stateData.results || stateData.questions)) {
      // Normalize to a common shape: { questions: [{id, question, optionA..D, correctAnswer}], results: { questionId: userAnswer }}
      setResultData({
        documentName: stateData.documentName || stateData.document?.filename || "Quiz",
        score: stateData.score,
        total: stateData.totalQuestions || stateData.total,
        answeredCount: stateData.answeredCount,
        // Expect stateData.results to be either array of per-question results or map
        results: stateData.results,
        questions: stateData.questions,
      });
      setLoading(false);
      return;
    }

    // Fallback: fetch result from backend endpoint. Do not modify backend; just call read-only route.
    const fetchResult = async () => {
      try {
        const res = await fetch(`https://note2brain-backend.onrender.com/quiz/${quizId}/result?user_id=${userId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        // Try to normalize the backend response to the expected format
        if (payload.success && payload.data) {
          const data = payload.data;
          setResultData({
            documentName: data.document?.filename || "Quiz",
            score: data.score,
            total: data.total || data.questions?.length,
            answeredCount: data.answeredCount,
            results: data.results,
            questions: data.questions,
          });
        } else {
          console.warn("Unexpected result payload, using fallback mock");
          setResultData(getMockResult());
        }
      } catch (err) {
        console.error("Error fetching quiz result:", err);
        setResultData(getMockResult());
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [quizId, location.state, navigate]);

  function getMockResult() {
    return {
      documentName: "Mock Document",
      score: 1,
      total: 2,
      answeredCount: 2,
      questions: [
        { id: "q1", question: "Mock Q1?", optionA: "A1", optionB: "B1", optionC: "C1", optionD: "D1", correctAnswer: "A" },
        { id: "q2", question: "Mock Q2?", optionA: "A2", optionB: "B2", optionC: "C2", optionD: "D2", correctAnswer: "B" },
      ],
      results: { q1: "A", q2: "C" },
    };
  }

  const handlePrev = () => {
    if (currentQuestionIdx > 0 && !isTransitioning) {
      setIsTransitioning(true);
      const card = document.querySelector('.quiz-question-card');
      card.classList.add('transitioning');
      
      setTimeout(() => {
        setCurrentQuestionIdx(idx => idx - 1);
        setTimeout(() => {
          card.classList.remove('transitioning');
          setIsTransitioning(false);
        }, 300);
      }, 300);
    }
  };
  const handleNext = () => {
    if (!resultData?.questions) return;
    if (currentQuestionIdx < resultData.questions.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      const card = document.querySelector('.quiz-question-card');
      card.classList.add('transitioning');
      
      setTimeout(() => {
        setCurrentQuestionIdx(idx => idx + 1);
        setTimeout(() => {
          card.classList.remove('transitioning');
          setIsTransitioning(false);
        }, 300);
      }, 300);
    }
  };

  if (loading) return <div className="home-root"><div>Loading results...</div></div>;
  if (!resultData || !resultData.questions || resultData.questions.length === 0) return <div className="home-root"><div>No results available.</div></div>;

  const questions = resultData.questions;
  const total = resultData.total || questions.length;
  const currentQ = questions[currentQuestionIdx];

  // ใช้ข้อมูลจาก backend โดยตรง - currentQ มี userAnswer, correctAnswer
  const userAnswer = currentQ.userAnswer;
  const correctAnswer = currentQ.correctAnswer;

  const optionKeys = ["A","B","C","D"].filter(k => currentQ[`option${k}`] !== undefined);

  return (
    <div className="home-root">
      <main className="quiz-main">
        <div className="quiz-section page-transition">
          <div className={`quiz-question-card ${isTransitioning ? 'transitioning' : ''}`}>
            <div className="quiz-card-header">
              <button className="quiz-back-btn" onClick={() => navigate('/home')}>‹ Back to Home</button>
              <div style={{marginLeft:20}}>
                <div style={{fontWeight:700}}>{resultData.documentName}</div>
                <div style={{fontSize:13,color:'#e2e8f0'}}>{`Score: ${resultData.score ?? '-'} / ${total}`}</div>
              </div>
            </div>

            <div className="quiz-question-box">
              <div className="quiz-question">{currentQ.question}</div>

              <div className="quiz-navigation">
                <button className="quiz-nav-btn quiz-nav-prev" onClick={handlePrev} disabled={currentQuestionIdx === 0 || isTransitioning}>‹</button>
                <span className="quiz-counter">
                  <span className="current-number">{currentQuestionIdx + 1}</span>
                  <span className="divider">/</span>
                  <span className="total-number">{questions.length}</span>
                </span>
                <button className="quiz-nav-btn quiz-nav-next" onClick={handleNext} disabled={currentQuestionIdx === questions.length - 1 || isTransitioning}>›</button>
              </div>
            </div>

            <div className="quiz-options quiz-showans-options">
              {optionKeys.map(optionKey => {
                const optText = currentQ[`option${optionKey}`];
                const isCorrect = String(optionKey) === String(correctAnswer);
                const isUser = String(optionKey) === String(userAnswer);
                // ใช้ isCorrect จาก backend เมื่อเป็นคำตอบของ user
                const isWrong = isUser && !currentQ.isCorrect;
                const classes = [
                  'quiz-option-label',
                  isCorrect ? 'correct' : '',
                  isWrong ? 'incorrect' : '',
                ].join(' ');

                return (
                  <div key={optionKey} className={classes}>
                    <div className={`option-number ${isCorrect ? 'correct' : (!isCorrect && isUser ? 'incorrect' : '')}`}>{optionKey}</div>
                    <div className={`option-text ${isCorrect ? 'correct' : (!isCorrect && isUser ? 'incorrect' : '')}`}>
                      {optText}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
