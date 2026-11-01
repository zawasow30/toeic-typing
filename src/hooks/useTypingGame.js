import { useState, useEffect, useCallback, useRef } from 'react';
import { LIST_IDS, fetchWordList } from '../wordLists';
import { adjustWordProgress, sortByProgress } from '../wordProgress';

const TIME_LIMIT = 120; // 120 seconds per game

export function useTypingGame() {
  const [status, setStatus] = useState('idle'); // 'idle', 'playing', 'result'
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [typed, setTyped] = useState('');
  const [untyped, setUntyped] = useState('');
  
  const [score, setScore] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  
  const [missedWords, setMissedWords] = useState([]);
  const [hintedWords, setHintedWords] = useState([]);
  const [isHardMode, setIsHardMode] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const isTimeUp = useRef(false);
  const hintShownForWord = useRef(false);

  // Fetch and parse words
  const loadWords = async (listId) => {
    try {
      let parsedWords = [];
      if (listId === 'random') {
        const results = await Promise.all(LIST_IDS.map(fetchWordList));
        parsedWords = results.flat();
      } else {
        parsedWords = await fetchWordList(listId);
      }
        
      const orderedWords = sortByProgress(parsedWords);
      setWords(orderedWords);
      return orderedWords;
    } catch (error) {
      console.error('Failed to load words:', error);
      return [];
    }
  };

  const startGame = async (listId, hardMode = false) => {
    const loadedWords = await loadWords(listId);
    if (loadedWords.length === 0) return;
    
    setIsHardMode(hardMode);
    setIsRandomMode(listId === 'random');
    setScore(0);
    setMissCount(0);
    setMissedWords([]);
    setHintedWords([]);
    setTimeLeft(listId === 'random' ? 300 : TIME_LIMIT);
    setCurrentIndex(0);
    isTimeUp.current = false;
    hintShownForWord.current = false;
    
    const firstWord = loadedWords[0].english;
    setTyped('');
    setUntyped(firstWord);
    setStatus('playing');
    setShowHint(false);
  };

  // Timer logic
  useEffect(() => {
    if (status !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          isTimeUp.current = true;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [status]);

  // Hint logic
  useEffect(() => {
    if (status !== 'playing' || !isHardMode) return;
    
    const hintTimer = setTimeout(() => {
      setShowHint(true);
      // ヒントが出た時点で減らす（出た回は途中で Quit しても 1 減る）
      if (words[currentIndex] && !hintShownForWord.current) {
        hintShownForWord.current = true;
        adjustWordProgress(words[currentIndex], -1);
      }
      setHintedWords(prev => {
        if (words[currentIndex] && !prev.find(w => w.english === words[currentIndex].english)) {
          return [...prev, words[currentIndex]];
        }
        return prev;
      });
    }, 3000);
    
    return () => clearTimeout(hintTimer);
  }, [untyped, status, isHardMode, currentIndex, words]);

  // Typing logic
  // Shared by the physical keyboard and the on-screen keyboard
  const inputKey = useCallback((key) => {
    if (status !== 'playing') return;
    
    const expectedChar = untyped[0];
    
    if (key === expectedChar) {
      // Correct type
      const newTyped = typed + key;
      const newUntyped = untyped.slice(1);
      
      setTyped(newTyped);
      setUntyped(newUntyped);
      setShowHint(false);
      
      if (newUntyped.length === 0) {
        // Word finished
        setScore(prev => prev + newTyped.length * 10);
        
        // Hard Mode 以外は単語が見えているので進捗に数えない
        if (isHardMode && !hintShownForWord.current) {
          adjustWordProgress(words[currentIndex], 1);
        }
        hintShownForWord.current = false;
        
        if (isTimeUp.current) {
          setStatus('result');
          return;
        }
        
        const nextIndex = currentIndex + 1;
        if (nextIndex < words.length) {
          setCurrentIndex(nextIndex);
          setTyped('');
          setUntyped(words[nextIndex].english);
        } else {
          // Finished all words
          setStatus('result');
        }
      }
    } else {
      // Miss type
      setMissCount(prev => prev + 1);
      
      const currentWordObj = words[currentIndex];
      setMissedWords(prev => {
        if (!prev.find(w => w.english === currentWordObj.english)) {
          return [...prev, currentWordObj];
        }
        return prev;
      });
    }
  }, [status, untyped, typed, currentIndex, words, isHardMode]);

  const handleKeyDown = useCallback((e) => {
    if (status !== 'playing') return;
    
    // Ignore modifier keys
    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
    
    e.preventDefault();
    inputKey(e.key);
  }, [status, inputKey]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resetGame = () => {
    setStatus('idle');
  };

  return {
    status,
    currentWord: words[currentIndex],
    typed,
    untyped,
    score,
    missCount,
    timeLeft,
    missedWords,
    hintedWords,
    isHardMode,
    isRandomMode,
    showHint,
    startGame,
    resetGame,
    inputKey
  };
}
