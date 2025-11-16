import React, { useState } from 'react';
import './QuizGenerate.css';

export default function QuizGenerate({ isOpen, onClose, onCreateQuiz, documentName }) {
  const [difficulty, setDifficulty] = useState('Easy');
  const [numQuestions, setNumQuestions] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleCreateClick = async () => {
    setIsGenerating(true);
    const finalNumQuestions = Math.max(1, Number(numQuestions));
    
    try {
      await onCreateQuiz({ difficulty, numQuestions: finalNumQuestions });
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  const handleNumChange = (e) => {
    // ป้องกันการใส่ค่าว่างหรือค่าที่ไม่ใช่ตัวเลข
    const value = e.target.value;
    setNumQuestions(value === '' ? '' : Number(value));
  };

  if (isGenerating) {
    return (
      <div className="quiz-loading-overlay">
        <div className="quiz-loading-container">
          <div className="loading-icon"></div>
          <h2 className="loading-text">Generating Quiz</h2>
          <p className="loading-subtext">
            Creating {numQuestions} {difficulty.toLowerCase()} questions 
            for {documentName}...
          </p>
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-modal-overlay" onClick={onClose}>
      <div className="quiz-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Setup Quiz</h2>
        <p className="doc-name">Document: {documentName}</p>
        
        <div className="quiz-form-group">
          <label htmlFor="difficulty">Difficulty Level</label>
          <select 
            id="difficulty" 
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        <div className="quiz-form-group">
          <label htmlFor="numQuestions">Number of Questions</label>
          {/* ✨ [แก้ไข] เปลี่ยน min เป็น 1 และลบ max ออก */}
          <input 
            type="number" 
            id="numQuestions" 
            value={numQuestions}
            onChange={handleNumChange}
            min="1" // ห้ามน้อยกว่า 1
            // ไม่มี max attribute อีกต่อไป
          />
        </div>

        <div className="quiz-modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          {/* ป้องกันการกดสร้างถ้ายังไม่ได้ใส่จำนวนข้อ */}
          <button 
            className="create-btn" 
            onClick={handleCreateClick}
            disabled={!numQuestions || Number(numQuestions) < 1}
          >
            Generate Quiz
          </button>
        </div>
      </div>
    </div>
  );
}