import { useState, useEffect } from 'react';
import { useTypingGame } from './hooks/useTypingGame';
import { Keyboard, ArrowRight, RotateCcw, Trophy, FolderOpen } from 'lucide-react';
import { VirtualKeyboard } from './VirtualKeyboard';
import { LIST_IDS, fetchWordList } from './wordLists';
import { getListProgress } from './wordProgress';

// スマホ・タブレット（指で操作する端末）ではアプリ内キーボードを表示する
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

// リストの進捗率ごとの色（below: この % 未満に適用）
const PROGRESS_COLORS = [
  { below: 25, card: 'border-red-900/60 bg-red-950/20', text: 'text-red-400', bar: 'bg-red-400' },
  { below: 50, card: 'border-orange-900/60 bg-orange-950/20', text: 'text-orange-400', bar: 'bg-orange-400' },
  { below: 75, card: 'border-yellow-900/60 bg-yellow-950/20', text: 'text-yellow-400', bar: 'bg-yellow-400' },
  { below: 100, card: 'border-lime-900/60 bg-lime-950/20', text: 'text-lime-400', bar: 'bg-lime-400' },
  { below: Infinity, card: 'border-emerald-800/70 bg-emerald-950/30', text: 'text-emerald-400', bar: 'bg-emerald-400' }
];
const NO_PROGRESS_COLOR = { card: 'border-zinc-800', text: 'text-zinc-500', bar: 'bg-zinc-300' };

function getProgressColor(percent) {
  if (!percent) return NO_PROGRESS_COLOR;
  return PROGRESS_COLORS.find(color => percent < color.below);
}

function App() {
  const game = useTypingGame();

  const handleOpenWords = () => {
    if (window.electronAPI?.openWordsFolder) {
      window.electronAPI.openWordsFolder();
    }
  };

  return (
    <div className="app-frame bg-[#09090b] text-[#fafafa] flex flex-col font-sans selection:bg-zinc-800 selection:text-white">

      {/* macOS タイトルバー対応ヘッダー (app-drag: ウィンドウ移動可能, ボタン類: app-no-drag) */}
      <header className={`w-full border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 app-drag select-none ${game.status === 'playing' && isTouchDevice ? 'hidden' : ''}`}>
        <div className="max-w-4xl mx-auto px-6 h-12 short:h-10 flex items-center justify-between">
          <div className={`flex items-center gap-2 ${window.electronAPI ? 'pl-14 sm:pl-16' : ''}`}>
            <Keyboard className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
              TOEIC Typing
            </span>
          </div>

          <div className="flex items-center gap-3 app-no-drag">
            {window.electronAPI?.openWordsFolder && (
              <button
                onClick={handleOpenWords}
                title="単語テキストフォルダをFinderで開く (Cmd+O)"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded-md bg-zinc-900/40 hover:bg-zinc-900 transition-colors duration-200 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>単語フォルダ</span>
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className={`flex-1 w-full mx-auto flex flex-col justify-center ${game.status === 'playing' && isTouchDevice ? 'p-3' : 'max-w-4xl p-6 short:py-4'}`}>
        {game.status === 'idle' && <Home onStart={game.startGame} />}
        {game.status === 'playing' && <Play game={game} />}
        {game.status === 'result' && <Result game={game} />}
      </main>
    </div>
  );
}

function Home({ onStart }) {
  const [hardMode, setHardMode] = useState(() => {
    const saved = localStorage.getItem('toeic_typing_hard_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('toeic_typing_hard_mode', JSON.stringify(hardMode));
  }, [hardMode]);

  const [listProgress, setListProgress] = useState({});

  useEffect(() => {
    let cancelled = false;
    LIST_IDS.forEach(async (id) => {
      try {
        const progress = getListProgress(await fetchWordList(id));
        if (!cancelled && progress.max > 0) {
          setListProgress(prev => ({ ...prev, [id]: progress }));
        }
      } catch (error) {
        console.error(`Failed to load progress for list ${id}:`, error);
      }
    });
    return () => { cancelled = true; };
  }, []);
  
  return (
    <div className="max-w-xl short:max-w-3xl mx-auto w-full space-y-12 short:space-y-4">
      <div className="space-y-4 short:space-y-2">
        <h2 className="text-2xl short:text-xl font-semibold tracking-tight">Select a level</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Choose a word list to start typing.
          </p>
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer group">
            <div className={`w-10 h-5 rounded-full transition-colors duration-200 ease-out flex items-center px-1 ${hardMode ? 'bg-zinc-200' : 'bg-zinc-800'}`}>
              <div className={`w-3 h-3 rounded-full bg-black transition-transform duration-200 ease-out ${hardMode ? 'translate-x-5' : 'translate-x-0 bg-zinc-400'}`} />
            </div>
            <input 
              type="checkbox" 
              checked={hardMode} 
              onChange={(e) => setHardMode(e.target.checked)}
              className="hidden"
            />
            Hard Mode (Blind)
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 short:grid-cols-10 gap-4 short:gap-2">
        {LIST_IDS.map(num => {
          const progress = listProgress[num];
          const percent = progress ? (progress.total / progress.max) * 100 : 0;
          const color = getProgressColor(percent);
          return (
            <button
              key={num}
              onClick={() => onStart(num, hardMode)}
              className={`group flex flex-col items-center justify-center p-4 short:p-1.5 short:h-14 border ${color.card} rounded-xl hover:border-zinc-600 hover:bg-zinc-900/50 active:bg-zinc-900 transition-all duration-200 ease-out`}
            >
              <span className="text-lg short:text-sm short:leading-4 font-medium text-zinc-300 group-hover:text-white transition-colors duration-200">
                <span className="short:hidden">List </span>{num}
              </span>
              <span className={`text-xs short:text-[10px] short:leading-3 font-mono ${color.text} mt-2 short:mt-0.5`}>
                {progress ? `${progress.total}/${progress.max}` : '\u00a0'}
              </span>
              <span className="w-full h-0.5 mt-2 short:mt-1 rounded-full bg-zinc-800 overflow-hidden">
                <span
                  className={`block h-full ${color.bar}`}
                  style={{ width: `${percent}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-4 short:pt-3 border-t border-zinc-800/50">
        <button
          onClick={() => onStart('random', hardMode)}
          className="w-full group flex flex-col items-center justify-center p-6 short:p-3 active:bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 hover:bg-zinc-900/50 transition-all duration-200 ease-out bg-zinc-900/20"
        >
          <span className="text-lg font-medium text-zinc-300 group-hover:text-white transition-colors duration-200 flex items-center gap-2">
            Random All <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">5 min</span>
          </span>
          <span className="text-xs text-zinc-500 mt-2 flex items-center gap-1 short:hidden">
            Start Challenge <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </span>
        </button>
      </div>
    </div>
  );
}

function Play({ game }) {
  const { currentWord, typed, untyped, score, isHardMode, showHint, inputKey } = game;
  
  if (!currentWord) return null;

  const displayUntyped = isHardMode
    ? (typed.length === 0 && untyped.length > 0
        ? untyped[0] + untyped.slice(1).replace(/./g, '·')
        : untyped.replace(/./g, '·'))
    : untyped;

  const stats = (
    <div className={`flex text-sm ${isTouchDevice ? 'gap-8' : 'gap-12'}`}>
      <div className={`flex items-center ${isTouchDevice ? 'gap-2' : 'flex-col'}`}>
        <span className={`text-zinc-500 ${isTouchDevice ? 'text-xs' : 'mb-1'}`}>TIME</span>
        <span className={`font-mono ${isTouchDevice ? 'text-base' : 'text-xl'}`}>{Math.floor(game.timeLeft / 60)}:{(game.timeLeft % 60).toString().padStart(2, '0')}</span>
      </div>
      <div className={`flex items-center ${isTouchDevice ? 'gap-2' : 'flex-col'}`}>
        <span className={`text-zinc-500 ${isTouchDevice ? 'text-xs' : 'mb-1'}`}>SCORE</span>
        <span className={`font-mono ${isTouchDevice ? 'text-base' : 'text-xl'}`}>{score}</span>
      </div>
      <div className={`flex items-center ${isTouchDevice ? 'gap-2' : 'flex-col'}`}>
        <span className={`text-zinc-500 ${isTouchDevice ? 'text-xs' : 'mb-1'}`}>MISS</span>
        <span className={`font-mono ${isTouchDevice ? 'text-base' : 'text-xl'}`}>{game.missCount}</span>
      </div>
    </div>
  );

  return (
    <div className={`w-full flex flex-col items-center ${isTouchDevice ? 'h-[calc(var(--app-h)-1.5rem)] gap-3' : 'justify-center py-24 space-y-16'}`}>
      {isTouchDevice && (
        <div className="w-full flex items-center justify-between">
          {stats}
          <button
            onClick={game.resetGame}
            className="text-xs text-zinc-500 px-3 py-1.5 border border-zinc-800 rounded-md active:bg-zinc-900"
          >
            Quit
          </button>
        </div>
      )}
      <div className={`text-center ${isTouchDevice ? 'flex-1 flex flex-col justify-center space-y-3' : 'space-y-6'}`}>
        <div className="text-5xl md:text-7xl short:text-4xl font-mono tracking-tight font-medium flex items-center justify-center">
          <span className="text-white relative z-10">{typed}</span>
          <span className="text-zinc-600 relative z-10">
            <span className={`transition-opacity ease-out inline-block ${showHint && isHardMode ? 'duration-1000 opacity-0' : 'duration-0 opacity-100'}`}>
              {displayUntyped}
            </span>
            {isHardMode && (
              <span className={`absolute left-0 top-0 text-zinc-500 transition-opacity ease-out ${showHint ? 'duration-1000 opacity-100' : 'duration-0 opacity-0 pointer-events-none'}`}>
                {untyped}
              </span>
            )}
          </span>
        </div>
        <div className="text-lg md:text-xl short:text-base text-zinc-400 font-medium tracking-wide">
          {currentWord.japanese}
        </div>
      </div>
      
      {isTouchDevice ? (
        <div className="w-full max-w-4xl h-[52%] shrink-0">
          <VirtualKeyboard onKey={inputKey} />
        </div>
      ) : stats}
    </div>
  );
}

function Result({ game }) {
  const { score, missCount, hintedWords, resetGame, isRandomMode } = game;
  const totalKeystrokes = (score / 10) + missCount;
  const accuracy = totalKeystrokes > 0 
    ? (((score / 10) / totalKeystrokes) * 100).toFixed(1)
    : 0;

  // Only review hinted words
  const allReviewWords = hintedWords || [];
  
  // Calculate worst parts based on hinted words
  let worstLists = [];
  if (isRandomMode && allReviewWords.length > 0) {
    const counts = {};
    allReviewWords.forEach(w => {
      if (w.listId) {
        counts[w.listId] = (counts[w.listId] || 0) + 1;
      }
    });
    
    if (Object.keys(counts).length > 0) {
      const maxCount = Math.max(...Object.values(counts));
      worstLists = Object.entries(counts)
        .filter(([, count]) => count === maxCount)
        .map(([id]) => id);
    }
  }
    
  return (
    <div className="max-w-2xl mx-auto w-full space-y-12 py-12 short:space-y-6 short:py-2">
      <div className="text-center space-y-4">
        <Trophy className="w-12 h-12 mx-auto text-zinc-700 mb-6 short:hidden" />
        <h2 className="text-3xl font-semibold tracking-tight">Time's up</h2>
        <p className="text-zinc-400">Here's how you did</p>
      </div>
      
      <div className="grid grid-cols-3 gap-6 p-6 border border-zinc-800 rounded-2xl bg-zinc-900/20">
        <div className="flex flex-col items-center space-y-1">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Score</span>
          <span className="text-2xl font-mono">{score}</span>
        </div>
        <div className="flex flex-col items-center space-y-1 border-x border-zinc-800">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Accuracy</span>
          <span className="text-2xl font-mono">{accuracy}%</span>
        </div>
        <div className="flex flex-col items-center space-y-1">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Misses</span>
          <span className="text-2xl font-mono">{missCount}</span>
        </div>
      </div>
      
      {allReviewWords.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Words to review</h3>
          <ul className="space-y-2">
            {allReviewWords.map((w, i) => {
              return (
                <li key={i} className="flex flex-col sm:flex-row sm:justify-between p-4 border border-zinc-800/50 rounded-lg text-sm bg-zinc-900/10 gap-2 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">{w.english}</span>
                    <div className="flex gap-2">
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-yellow-950/50 text-yellow-400 border border-yellow-900/50">Hinted</span>
                      {w.listId && isRandomMode && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">List {w.listId}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-400 text-left sm:text-right">{w.japanese}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isRandomMode && worstLists.length > 0 && (
        <div className="mt-8 p-6 border border-red-900/30 bg-red-950/10 rounded-2xl">
          <h3 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            ⚠️ 苦手なパート (Most Hinted)
          </h3>
          <p className="text-zinc-300">
            List {worstLists.join(', List ')} の単語で一番ヒントを頼っています。復習してみましょう！
          </p>
        </div>
      )}
      
      <div className="flex justify-center pt-8 short:pt-2 pb-4">
        <button
          onClick={resetGame}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-full hover:bg-zinc-200 transition-colors duration-200"
        >
          <RotateCcw className="w-4 h-4" />
          Play Again
        </button>
      </div>
    </div>
  );
}

export default App;
