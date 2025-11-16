import React, { useState } from 'react';
import './FlashcardGenerate.css';

export default function FlashcardGenerate({ isOpen, onClose, onCreateFlashcard, documentName }) {
  const [numQuestions, setNumQuestions] = useState(10);

  if (!isOpen) {
    return null;
  }

  const handleCreateClick = () => {
    const finalNumQuestions = Math.max(1, Number(numQuestions));
    onCreateFlashcard({ numQuestions: finalNumQuestions });
    onClose();
  };

  const handleNumChange = (e) => {
    const value = e.target.value;
    setNumQuestions(value === '' ? '' : Number(value));
  };

  return (
    <div className="flashcard-modal-overlay" onClick={onClose}>
      <div className="flashcard-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Setup Flashcard</h2>
        <p className="doc-name">Document: {documentName}</p>
        
        <div className="flashcard-form-group">
          <label htmlFor="numQuestions">Number of Questions</label>
          <input 
            type="number" 
            id="numQuestions" 
            value={numQuestions}
            onChange={handleNumChange}
            min="1"
            max="20"
          />
        </div>

        <div className="flashcard-modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="create-btn" 
            onClick={handleCreateClick}
            disabled={!numQuestions || Number(numQuestions) < 1}
          >
            Generate Flashcard
          </button>
        </div>
      </div>
    </div>
  );
}