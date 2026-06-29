import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { KeystrokeLog } from '../types';

interface TypingAreaProps {
  textContent: string;
  difficulty: 'normal' | 'expert' | 'master';
  onProgressUpdate: (data: {
    progress: number;
    wpm: number;
    rawWpm: number;
    accuracy: number;
    errorCount: number;
    correctChars: number;
    incorrectChars: number;
    finished: boolean;
    timeTakenMs: number;
    timelineEntry?: { time: number; wpm: number; accuracy: number; progress: number };
    replayData: KeystrokeLog[];
  }) => void;
  isActive: boolean;
  startTime: number | null;
}

export const TypingArea = React.memo<TypingAreaProps>(({
  textContent,
  difficulty,
  onProgressUpdate,
  isActive,
  startTime
}) => {
  const words = useMemo(() => textContent.split(' '), [textContent]);
  const totalCharacters = textContent.length;

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [wordHistory, setWordHistory] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(true);

  // Statistics counters
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);

  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const replayDataRef = useRef<KeystrokeLog[]>([]);
  
  // High-frequency metrics throttle
  const lastUpdateRef = useRef<number>(0);

  // Initialize and focus
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  // Reset state when typing content changes
  useEffect(() => {
    setCurrentWordIndex(0);
    setCurrentInput('');
    setWordHistory([]);
    setTotalKeystrokes(0);
    setErrorCount(0);
    setHasFailed(false);
    replayDataRef.current = [];
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [textContent]);

  // Focus utility
  const handleContainerClick = () => {
    if (isActive && inputRef.current && !hasFailed) {
      inputRef.current.focus();
      setIsFocused(true);
    }
  };

  // Evaluate current accuracy and keystroke stats
  const typingStats = useMemo(() => {
    let correctChars = 0;
    let incorrectChars = 0;

    // 1. Process completed words in history
    wordHistory.forEach((typedWord, idx) => {
      const targetWord = words[idx];
      if (!targetWord) return;

      const minLen = Math.min(typedWord.length, targetWord.length);
      for (let i = 0; i < minLen; i++) {
        if (typedWord[i] === targetWord[i]) correctChars++;
        else incorrectChars++;
      }

      // Any missed characters count as errors
      if (typedWord.length < targetWord.length) {
        incorrectChars += targetWord.length - typedWord.length;
      }
      // Any extra characters in typed word count as errors
      if (typedWord.length > targetWord.length) {
        incorrectChars += typedWord.length - targetWord.length;
      }
      
      // Account for the spaces between words
      if (idx < words.length - 1) {
        // Space itself: did they type it?
        correctChars++; // Simplified: assume space is correct if word is completed
      }
    });

    // 2. Process active typing word
    const targetWord = words[currentWordIndex] || '';
    for (let i = 0; i < currentInput.length; i++) {
      if (i < targetWord.length) {
        if (currentInput[i] === targetWord[i]) correctChars++;
        else incorrectChars++;
      } else {
        // Extra letters typed in current word
        incorrectChars++;
      }
    }

    const typedLength = wordHistory.join(' ').length + (wordHistory.length > 0 ? 1 : 0) + currentInput.length;
    const progress = Math.min(100, parseFloat(((typedLength / totalCharacters) * 100).toFixed(1)));

    return {
      correctChars,
      incorrectChars,
      progress
    };
  }, [wordHistory, currentInput, words, currentWordIndex, totalCharacters]);

  // Periodic metrics reporting (every 100ms)
  const reportProgress = (isFinished = false) => {
    if (!startTime) return;
    const elapsedMs = Date.now() - startTime;
    const elapsedMin = elapsedMs / 60000;

    const { correctChars, incorrectChars, progress } = typingStats;

    // Calculate WPM: (correct chars / 5) / time
    const wpm = elapsedMin > 0 ? Math.round((correctChars / 5) / elapsedMin) : 0;
    // Raw WPM: (total characters typed / 5) / time
    const rawWpm = elapsedMin > 0 ? Math.round((totalKeystrokes / 5) / elapsedMin) : 0;
    // Accuracy
    const accuracy = totalKeystrokes > 0 ? Math.round((correctChars / totalKeystrokes) * 100) : 100;

    const shouldSendUpdate = Date.now() - lastUpdateRef.current > 100 || isFinished;

    if (shouldSendUpdate) {
      lastUpdateRef.current = Date.now();

      // Add timeline chart logging
      const timelineEntry = {
        time: parseFloat((elapsedMs / 1000).toFixed(1)),
        wpm,
        accuracy,
        progress
      };

      onProgressUpdate({
        progress,
        wpm,
        rawWpm,
        accuracy,
        errorCount,
        correctChars,
        incorrectChars,
        finished: isFinished,
        timeTakenMs: elapsedMs,
        timelineEntry,
        replayData: replayDataRef.current
      });
    }
  };

  // Keyboard input logic
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isActive || !startTime || hasFailed) {
      e.preventDefault();
      return;
    }

    const { key } = e;
    
    // Prevent default hotkeys that break typing experience
    if (key === 'Enter') {
      e.preventDefault();
      return;
    }

    const targetWord = words[currentWordIndex] || '';

    // Handle backspace
    if (key === 'Backspace') {
      e.preventDefault();
      
      // Log keystroke for replay
      const offsetTime = Date.now() - startTime;
      replayDataRef.current.push({
        t: offsetTime,
        k: 'Backspace',
        a: 'delete',
        e: false
      });

      if (currentInput.length > 0) {
        setCurrentInput(prev => prev.slice(0, -1));
        setTotalKeystrokes(prev => prev + 1);
      } else if (currentWordIndex > 0) {
        // Go back to previous word
        const prevWord = wordHistory[wordHistory.length - 1];
        setWordHistory(prev => prev.slice(0, -1));
        setCurrentWordIndex(prev => prev - 1);
        setCurrentInput(prevWord);
        setTotalKeystrokes(prev => prev + 1);
      }
      return;
    }

    // Handle spacebar (word separator)
    if (key === ' ') {
      e.preventDefault();
      if (currentInput.trim() === '') return; // block leading spaces
      
      const offsetTime = Date.now() - startTime;
      replayDataRef.current.push({
        t: offsetTime,
        k: ' ',
        a: 'insert',
        e: currentInput !== targetWord
      });

      setTotalKeystrokes(prev => prev + 1);

      // Check expert mode
      if (difficulty === 'expert' && currentInput !== targetWord) {
        // Highlight error, block progress
        setErrorCount(prev => prev + 1);
        return;
      }

      // Check if this was the last word
      if (currentWordIndex === words.length - 1) {
        // Submit last word and finish
        const finalHistory = [...wordHistory, currentInput];
        setWordHistory(finalHistory);
        setCurrentInput('');
        reportProgress(true); // Explicit finish trigger
      } else {
        // Normal transition
        setWordHistory(prev => [...prev, currentInput]);
        setCurrentWordIndex(prev => prev + 1);
        setCurrentInput('');
      }
      return;
    }

    // Accept only single character visual key strokes
    if (key.length === 1) {
      e.preventDefault();
      setTotalKeystrokes(prev => prev + 1);
      
      const nextInput = currentInput + key;
      const expectedChar = targetWord[currentInput.length];
      const isError = key !== expectedChar;

      // Handle statistics mistake logging
      if (isError) {
        setErrorCount(prev => prev + 1);

        // Check master mode: One error fails the test instantly
        if (difficulty === 'master') {
          setHasFailed(true);
          setHasFailedState();
          return;
        }
      }

      // Log keystroke for playback
      const offsetTime = Date.now() - startTime;
      replayDataRef.current.push({
        t: offsetTime,
        k: key,
        a: 'insert',
        e: isError
      });

      // Update input string
      setCurrentInput(nextInput);

      // Check if we typed the final letter of the final word correctly
      const isLastWord = currentWordIndex === words.length - 1;
      if (isLastWord && nextInput === targetWord) {
        setWordHistory(prev => [...prev, nextInput]);
        setCurrentInput('');
        // Trigger immediate finish
        setTimeout(() => reportProgress(true), 10);
      }
    }
  };

  const setHasFailedState = () => {
    // Notify failure (finish with 0 wpm)
    if (!startTime) return;
    onProgressUpdate({
      progress: 0,
      wpm: 0,
      rawWpm: 0,
      accuracy: 0,
      errorCount,
      correctChars: 0,
      incorrectChars: totalCharacters,
      finished: true,
      timeTakenMs: Date.now() - startTime,
      replayData: replayDataRef.current
    });
  };

  // Report progress trigger on input changes
  useEffect(() => {
    if (startTime && isActive && !hasFailed) {
      reportProgress(false);
    }
  }, [currentInput, wordHistory, totalKeystrokes]);

  // Keep typing engine scrolling as we type
  useEffect(() => {
    if (wordsContainerRef.current) {
      const activeWordEl = wordsContainerRef.current.querySelector('.word-active');
      if (activeWordEl) {
        activeWordEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [currentWordIndex]);

  // Styles wrapper for individual letters
  const renderWord = (word: string, wordIdx: number) => {
    const isCurrent = wordIdx === currentWordIndex;
    const isPast = wordIdx < currentWordIndex;
    const typedWord = isPast ? wordHistory[wordIdx] : isCurrent ? currentInput : '';

    const wordClasses = `word ${isCurrent ? 'word-active' : ''} ${
      isPast && typedWord !== word ? 'word-error' : ''
    }`;

    // Letters representation
    const targetLetters = word.split('');
    const typedLetters = typedWord.split('');

    const elements: React.ReactNode[] = [];

    // Render characters
    const maxLen = Math.max(targetLetters.length, typedLetters.length);
    for (let i = 0; i < maxLen; i++) {
      const isCaretHere = isCurrent && i === typedInputLength(typedLetters);
      const isExtra = i >= targetLetters.length;

      let charClass = 'char-untyped';
      let displayChar = targetLetters[i];

      if (i < typedLetters.length) {
        if (isExtra) {
          charClass = 'char-extra';
          displayChar = typedLetters[i];
        } else if (typedLetters[i] === targetLetters[i]) {
          charClass = 'char-correct';
        } else {
          charClass = 'char-incorrect';
        }
      }

      elements.push(
        <span key={i} className={`char ${charClass}`}>
          {isCaretHere && <span className="caret"></span>}
          {displayChar}
        </span>
      );
    }

    // Place caret at the absolute end of the current word if we typed all letters
    const isCaretAtWordEnd = isCurrent && typedLetters.length >= targetLetters.length;
    if (isCaretAtWordEnd) {
      elements.push(
        <span key="caret-end" className="char-caret-end">
          <span className="caret"></span>
        </span>
      );
    }

    return (
      <div key={wordIdx} className={wordClasses} style={{ display: 'inline-block', margin: '0 6px 8px 6px' }}>
        {elements}
      </div>
    );
  };

  // Safe typed length counter
  const typedInputLength = (chars: string[]) => chars.length;

  return (
    <div 
      className={`typing-area-container ${!isFocused ? 'is-blurred' : ''}`}
      onClick={handleContainerClick}
      style={{
        position: 'relative',
        padding: '24px',
        borderRadius: '16px',
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        minHeight: '140px',
        cursor: 'text',
        userSelect: 'none'
      }}
    >
      {/* Hidden input field for typing mechanics */}
      <input
        ref={inputRef}
        type="text"
        onKeyDown={handleKeyDown}
        onBlur={() => setIsFocused(false)}
        onFocus={() => setIsFocused(true)}
        disabled={!isActive || hasFailed}
        onPaste={(e) => e.preventDefault()} // Block pasting cheating mechanics
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1
        }}
      />

      {/* Focus Overlays */}
      {!isFocused && isActive && !hasFailed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5, 6, 8, 0.75)',
            backdropFilter: 'blur(5px)',
            borderRadius: '16px',
            color: 'var(--color-primary)',
            fontWeight: 600,
            fontSize: '1.2rem',
            zIndex: 10,
            transition: 'all 0.3s ease'
          }}
        >
          🖱️ Click here to focus and type
        </div>
      )}

      {hasFailed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(239, 68, 68, 0.15)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            color: 'var(--color-char-incorrect)',
            fontWeight: 800,
            fontSize: '1.5rem',
            zIndex: 10
          }}
        >
          💀 ELIMINATED! (Master Mode Error)
        </div>
      )}

      {/* Words Box */}
      <div
        ref={wordsContainerRef}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          fontSize: '1.4rem',
          lineHeight: '1.8rem',
          maxHeight: '100px',
          overflowY: 'hidden',
          fontFamily: 'var(--font-mono)'
        }}
      >
        {words.map((word, idx) => renderWord(word, idx))}
      </div>

      <style>{`
        .char {
          position: relative;
          transition: color 0.1s ease;
        }
        .char-untyped {
          color: var(--color-char-untyped);
        }
        .char-correct {
          color: var(--color-char-correct);
        }
        .char-incorrect {
          color: var(--color-char-incorrect);
          text-decoration: underline;
        }
        .char-extra {
          color: var(--color-char-incorrect);
          opacity: 0.8;
        }
        .word-error {
          border-bottom: 2px dashed var(--color-char-incorrect);
        }
        .char-caret-end {
          position: relative;
          width: 0px;
          display: inline-block;
        }
      `}</style>
    </div>
  );
});
