const STORAGE_KEY = 'laxlas_data';

const DEFAULT_DATA = {
  settings: {
    openaiApiKey: '',
    ttsVoice: 'nova',
    ttsModel: 'gpt-4o-mini-tts',
    defaultLanguage: 'sv',
  },
  lists: [],
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const data = JSON.parse(raw);
    return {
      settings: { ...DEFAULT_DATA.settings, ...data.settings },
      lists: Array.isArray(data.lists) ? data.lists : [],
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getSettings() {
  return loadData().settings;
}

export function saveSettings(settings) {
  const data = loadData();
  data.settings = { ...data.settings, ...settings };
  saveData(data);
}

export function getLists() {
  return loadData().lists;
}

export function getListById(id) {
  return loadData().lists.find((l) => l.id === id);
}

export function saveList(list) {
  const data = loadData();
  const idx = data.lists.findIndex((l) => l.id === list.id);
  if (idx >= 0) {
    data.lists[idx] = list;
  } else {
    data.lists.push(list);
  }
  saveData(data);
}

export function deleteList(id) {
  const data = loadData();
  data.lists = data.lists.filter((l) => l.id !== id);
  saveData(data);
}

export function createNewList(language) {
  return {
    id: crypto.randomUUID(),
    name: '',
    language: language || 'sv',
    createdAt: new Date().toISOString(),
    words: [{ id: crypto.randomUUID(), text: '', hint: '' }],
  };
}

export function createNewWord() {
  return { id: crypto.randomUUID(), text: '', hint: '' };
}
