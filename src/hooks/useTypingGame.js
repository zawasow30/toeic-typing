import { useState, useEffect, useCallback, useRef } from 'react';

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

  // Fetch and parse words
  const loadWords = async (listId) => {
    try {
      const fetchList = async (id) => {
        let text = '';
        if (window.electronAPI?.readWordFile) {
          const res = await window.electronAPI.readWordFile(`${id}.txt`);
          if (res.success) {
            text = res.content;
          } else {
            console.error(`Failed to read word list ${id} via Electron:`, res.error);
            return [];
          }
        } else {
          const response = await fetch(`words/${id}.txt`);
          text = await response.text();
        }
        
        if (text.trim().toLowerCase().startsWith('<!doctype html>')) {
          console.error(`Word list ${id} not found.`);
          return [];
        }
        
        return text
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            const [english, ...japaneseArr] = line.split(',');
            return {
              english: english.trim(),
              japanese: japaneseArr.join(',').trim(),
              listId: id
            };
          })
          .filter(w => w.english.length > 0);
      };

      let parsedWords = [];
      if (listId === 'random') {
        const promises = Array.from({ length: 20 }, (_, i) => fetchList(i + 1));
        const results = await Promise.all(promises);
        parsedWords = results.flat();
      } else {
        parsedWords = await fetchList(listId);
      }
        
      // Shuffle words for the game
      const shuffled = [...parsedWords].sort(() => Math.random() - 0.5);
      setWords(shuffled);
      return shuffled;
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
  }, [status, untyped, typed, currentIndex, words]);

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
