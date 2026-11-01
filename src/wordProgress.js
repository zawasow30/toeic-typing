// 単語ごとの進捗 (0〜5) を localStorage に保存する
const STORAGE_KEY = 'toeic_typing_word_progress';
export const MAX_WORD_PROGRESS = 5;

const wordKey = (word) => `${word.listId}:${word.english}`;

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function adjustWordProgress(word, delta) {
  const progress = loadProgress();
  const key = wordKey(word);
  const next = (progress[key] ?? 0) + delta;
  progress[key] = Math.min(MAX_WORD_PROGRESS, Math.max(0, next));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// 進捗が低い単語から順に並べる（同じ進捗の中はランダム）
export function sortByProgress(words) {
  const progress = loadProgress();
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.sort((a, b) => (progress[wordKey(a)] ?? 0) - (progress[wordKey(b)] ?? 0));
}

export function getListProgress(words) {
  const progress = loadProgress();
  return {
    total: words.reduce((sum, word) => sum + (progress[wordKey(word)] ?? 0), 0),
    max: words.length * MAX_WORD_PROGRESS
  };
}
