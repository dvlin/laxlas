import * as store from './store.js';
import * as ui from './ui.js';
import * as tts from './tts.js';
import { compare, isCorrect } from './diff.js';

// ===== APP STATE =====
const state = {
  currentListId: null,
  currentWordIndex: 0,
  practiceMode: null, // 'computer' | 'paper'
  results: [],
  editingList: null,
};

// ===== VIEW SWITCHING =====

function showView(viewId) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const view = document.getElementById(`view-${viewId}`);
  if (view) view.classList.add('active');
}

// ===== NAVIGATION =====

function goHome() {
  showView('home');
  ui.renderListPicker();
}

function goEditor(listId) {
  if (listId) {
    state.editingList = structuredClone(store.getListById(listId));
  } else {
    const settings = store.getSettings();
    state.editingList = store.createNewList(settings.defaultLanguage);
  }
  showView('editor');
  ui.renderEditor(state.editingList);
}

function goModeSelector(listId) {
  state.currentListId = listId;
  const list = store.getListById(listId);
  showView('mode');
  ui.renderModeSelector(list);
}

function goPractice(mode) {
  state.practiceMode = mode;
  state.currentWordIndex = 0;
  state.results = [];
  showView('practice');
  showCurrentWord();
}

function goSummary() {
  showView('summary');
  ui.renderSummary(state.results);
}

function goSettings() {
  showView('settings');
  ui.renderSettings(store.getSettings());
}

// ===== PRACTICE LOGIC =====

function getCurrentList() {
  return store.getListById(state.currentListId);
}

function getValidWords() {
  const list = getCurrentList();
  return list ? list.words.filter((w) => w.text.trim() !== '') : [];
}

function showCurrentWord() {
  const words = getValidWords();
  const list = getCurrentList();
  if (state.currentWordIndex >= words.length) {
    goSummary();
    return;
  }
  ui.renderPracticeWord(
    state.currentWordIndex,
    words.length,
    list.name,
    state.practiceMode
  );
}

function checkAnswer() {
  const words = getValidWords();
  const word = words[state.currentWordIndex];
  const attempt = document.getElementById('practice-input').value;

  if (!attempt.trim()) return;

  const correct = isCorrect(attempt, word.text);

  if (correct) {
    state.results.push({ word: word.text, correct: true });
    ui.showCorrectFeedback();
  } else {
    const diffResult = compare(attempt, word.text);
    state.results.push({ word: word.text, correct: false });
    ui.showIncorrectFeedback(diffResult, word.text);
  }
}

function revealWord() {
  const words = getValidWords();
  const word = words[state.currentWordIndex];
  ui.showRevealedWord(word.text);
}

function selfAssess(correct) {
  const words = getValidWords();
  const word = words[state.currentWordIndex];
  state.results.push({ word: word.text, correct });
  nextWord();
}

function nextWord() {
  state.currentWordIndex++;
  showCurrentWord();
}

function tryAgain() {
  // Remove last result since they're retrying
  state.results.pop();
  showCurrentWord();
}

async function speakCurrentWord() {
  const words = getValidWords();
  const word = words[state.currentWordIndex];
  const list = getCurrentList();
  const btn = document.getElementById('btn-speak');

  btn.classList.add('speaking');
  try {
    await tts.speak(word.text, list.language);
  } catch (err) {
    console.error('TTS error:', err);
  }
  btn.classList.remove('speaking');
}

// ===== EDITOR LOGIC =====

function saveCurrentList() {
  const data = ui.getEditorData();
  state.editingList.name = data.name;
  state.editingList.language = data.language;
  state.editingList.words = data.words;

  // Remove empty words except the last one
  const nonEmpty = state.editingList.words.filter((w) => w.text.trim() !== '');
  if (nonEmpty.length > 0) {
    state.editingList.words = nonEmpty;
  }

  store.saveList(state.editingList);
  goHome();
}

function deleteCurrentList() {
  if (confirm('Vill du verkligen radera denna lista?')) {
    store.deleteList(state.editingList.id);
    goHome();
  }
}

function addWordRow() {
  const data = ui.getEditorData();
  state.editingList.words = data.words;
  state.editingList.words.push(store.createNewWord());
  ui.renderWordRows(state.editingList.words);

  // Focus the new row
  const rows = document.querySelectorAll('#word-rows .word-row');
  const lastRow = rows[rows.length - 1];
  lastRow.querySelector('.word-text').focus();
}

function removeWordRow(wordId) {
  const data = ui.getEditorData();
  state.editingList.words = data.words.filter((w) => w.id !== wordId);
  if (state.editingList.words.length === 0) {
    state.editingList.words.push(store.createNewWord());
  }
  ui.renderWordRows(state.editingList.words);
}

// ===== SETTINGS LOGIC =====

function saveSettingsForm() {
  const data = ui.getSettingsData();
  store.saveSettings(data);
  goHome();
}

async function testApiKey() {
  const key = document.getElementById('settings-apikey').value.trim();
  if (!key) {
    ui.showApiKeyStatus('Ange en API-nyckel först.', false);
    return;
  }

  ui.showApiKeyStatus('Testar...', true);
  try {
    await tts.testApiKey(key);
    ui.showApiKeyStatus('Fungerar! Du hör en testfras.', true);
  } catch (err) {
    ui.showApiKeyStatus(`Fel: ${err.message}`, false);
  }
}

// ===== EVENT LISTENERS =====

function init() {
  // Home
  document.getElementById('btn-new-list').addEventListener('click', () => goEditor(null));
  document.getElementById('btn-settings').addEventListener('click', goSettings);

  // List card actions (delegated)
  document.getElementById('list-container').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const listId = btn.dataset.listId;
    if (btn.dataset.action === 'edit') goEditor(listId);
    if (btn.dataset.action === 'practice') goModeSelector(listId);
  });

  // Editor
  document.getElementById('btn-save-list').addEventListener('click', saveCurrentList);
  document.getElementById('btn-delete-list').addEventListener('click', deleteCurrentList);
  document.getElementById('btn-add-word').addEventListener('click', addWordRow);

  // Word row remove (delegated)
  document.getElementById('word-rows').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-word');
    if (!btn) return;
    const row = btn.closest('.word-row');
    removeWordRow(row.dataset.wordId);
  });

  // Word row: Enter in last row adds new row
  document.getElementById('word-rows').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const rows = document.querySelectorAll('#word-rows .word-row');
      const lastRow = rows[rows.length - 1];
      if (e.target.closest('.word-row') === lastRow) {
        e.preventDefault();
        addWordRow();
      }
    }
  });

  // Mode selector
  document.getElementById('btn-mode-computer').addEventListener('click', () => goPractice('computer'));
  document.getElementById('btn-mode-paper').addEventListener('click', () => goPractice('paper'));

  // Practice
  document.getElementById('btn-speak').addEventListener('click', speakCurrentWord);
  document.getElementById('btn-check').addEventListener('click', checkAnswer);
  document.getElementById('btn-reveal').addEventListener('click', revealWord);
  document.getElementById('btn-try-again').addEventListener('click', tryAgain);
  document.getElementById('btn-next').addEventListener('click', nextWord);

  // Practice input: Enter to check
  document.getElementById('practice-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkAnswer();
    }
  });

  // Self-assessment (paper mode)
  document.getElementById('btn-self-correct').addEventListener('click', () => selfAssess(true));
  document.getElementById('btn-self-wrong').addEventListener('click', () => selfAssess(false));

  // Summary
  document.getElementById('btn-back-home').addEventListener('click', goHome);

  // Settings
  document.getElementById('btn-save-settings').addEventListener('click', saveSettingsForm);
  document.getElementById('btn-test-key').addEventListener('click', testApiKey);

  // Back buttons (delegated)
  document.querySelectorAll('.btn-back').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.navigate;
      if (target === 'home') goHome();
    });
  });

  // Keyboard shortcuts in practice
  document.addEventListener('keydown', (e) => {
    const practiceView = document.getElementById('view-practice');
    if (!practiceView.classList.contains('active')) return;

    // Space to speak (only when not typing in input)
    if (e.key === ' ' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      speakCurrentWord();
    }
  });

  // Initial render
  goHome();
}

document.addEventListener('DOMContentLoaded', init);
