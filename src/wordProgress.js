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

export function getListProgress(words) {
  const progress = loadProgress();
  return {
    total: words.reduce((sum, word) => sum + (progress[wordKey(word)] ?? 0), 0),
    max: words.length * MAX_WORD_PROGRESS
  };
}
