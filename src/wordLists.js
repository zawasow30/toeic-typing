// lists 1 to 20 based on words folder
export const LIST_IDS = Array.from({ length: 20 }, (_, i) => i + 1);

export async function fetchWordList(id) {
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
}
