import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./Document.css";
import "./Quiz.css";

export default function Quiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const fetchQuizData = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(`https://note2brain-backend.onrender.com/quiz/${quizId}?user_id=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch quiz');
        
        const result = await response.json();
        
        if (result.success && result.data) {
          setQuizData({
            documentName: result.data.document?.filename || "Quiz",
            documentId: result.data.document?.id,
            questions: result.data.questions
          });
        }
      } catch (error) {
        console.error("Error fetching quiz:", error);
        navigate("/home");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, navigate]);

  const handleAnswerChange = (answerKey, questionId) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answerKey }));
  };

  const handlePrevious = () => {
    if (currentQuestion > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentQuestion(currentQuestion - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleNext = () => {
     if (quizData?.questions && currentQuestion < quizData.questions.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleSubmit = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId || !quizId || !quizData) return;

    const answeredCountSubmit = Object.keys(selectedAnswers).length;
    if (answeredCountSubmit !== quizData.questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`https://note2brain-backend.onrender.com/submit-quiz?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          answers: selectedAnswers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to submit quiz." }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const submissionResult = await response.json();
      console.log("Submission Result:", submissionResult);

      if (submissionResult.success) {
        navigate(`/quiz/${quizId}/result`, {
          state: {
            score: submissionResult.score,
            totalQuestions: submissionResult.total,
            answeredCount: answeredCountSubmit,
            documentName: quizData.documentName,
            documentId: quizData.documentId,
          },
        });
      } else {
        throw new Error(submissionResult.detail || "Submission failed according to backend.");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert(`Error submitting quiz: ${error.message}`);
      setLoading(false);
    }
  };

  if (loading) return <div className="home-root"><div>Loading Quiz...</div></div>;
  if (!quizData || !quizData.questions || quizData.questions.length === 0) return <div className="home-root"><div>Could not load quiz data. Please try generating it again or check the URL.</div></div>;

  const totalQuestions = quizData.questions.length;
  const currentQ = quizData.questions[currentQuestion];
  const isLastQuestion = currentQuestion === totalQuestions - 1;
  const allAnswered = Object.keys(selectedAnswers).length === totalQuestions;

  return (
    <div className="home-root">
      <main className="quiz-main">
        <div className="quiz-section page-transition">
          <div className={`quiz-question-card ${isTransitioning ? 'transitioning' : ''}`}>

            <div className="quiz-card-header">
              <button className="quiz-back-btn" onClick={() => navigate('/home')}>
                ‹ Back to Home
              </button>
            </div>

            <div className="quiz-question-box">
              <div className="quiz-question">{currentQ.question}</div>

              <div className="quiz-navigation">
                <button
                  className="quiz-nav-btn quiz-nav-prev"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0 || isTransitioning}
                >
                  <span className="nav-arrow">‹</span>
                </button>
                <span className="quiz-counter">
                  <span className="current-number">{currentQuestion + 1}</span>
                  <span className="divider">/</span>
                  <span className="total-number">{totalQuestions}</span>
                </span>

                {isLastQuestion && allAnswered ? (
                  <button
                    className="quiz-submit-btn"
                    onClick={handleSubmit}
                    disabled={isTransitioning}
                  >
                    Submit
                  </button>
                ) : (
                  <button
                    className="quiz-nav-btn quiz-nav-next"
                    onClick={handleNext}
                    disabled={(isLastQuestion && !allAnswered) || isTransitioning}
                  >
                    <span className="nav-arrow">›</span>
                  </button>
                )}
              </div>
            </div>

            <div className="quiz-options">
              {['A', 'B', 'C', 'D'].map((optionKey) => (
                <label
                  key={optionKey}
                  className={`quiz-option-label ${selectedAnswers[currentQ.id] === optionKey ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`q_${currentQ.id}`}
                    value={optionKey}
                    checked={selectedAnswers[currentQ.id] === optionKey}
                    onChange={() => handleAnswerChange(optionKey, currentQ.id)}
                  />
                  <span className="option-number">{optionKey}</span>
                  <span className="option-text">{currentQ[`option${optionKey}`]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}