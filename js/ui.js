import { getLists, getListById, createNewWord } from './store.js';

// ===== DOM HELPERS =====

function $(selector) {
  return document.querySelector(selector);
}

function show(el) {
  if (typeof el === 'string') el = $(el);
  el.classList.remove('hidden');
}

function hide(el) {
  if (typeof el === 'string') el = $(el);
  el.classList.add('hidden');
}

// ===== HOME VIEW =====

export function renderListPicker() {
  const lists = getLists();
  const container = $('#list-container');
  container.innerHTML = '';

  if (lists.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><p>Inga listor ännu.</p><p>Skapa en ny lista för att börja öva!</p></div>';
    return;
  }

  for (const list of lists) {
    const validWords = list.words.filter((w) => w.text.trim() !== '');
    const card = document.createElement('div');
    card.className = 'list-card';
    card.innerHTML = `
      <div class="list-card-info">
        <div class="list-card-name">${escapeHtml(list.name || 'Namnlös lista')}</div>
        <div class="list-card-meta">
          <span class="lang-badge">${list.language === 'sv' ? 'SV' : 'EN'}</span>
          <span>${validWords.length} ord</span>
        </div>
      </div>
      <div class="list-card-actions">
        <button class="btn-card btn-edit" data-list-id="${list.id}" data-action="edit">Ändra</button>
        <button class="btn-card btn-practice" data-list-id="${list.id}" data-action="practice" ${validWords.length === 0 ? 'disabled' : ''}>Öva</button>
      </div>
    `;
    container.appendChild(card);
  }
}

// ===== EDITOR VIEW =====

export function renderEditor(list) {
  const isNew = !list.name;
  $('#editor-title').textContent = isNew ? 'Ny lista' : `Redigera: ${list.name}`;
  $('#list-name').value = list.name;
  $('#list-language').value = list.language;
  $('#btn-delete-list').classList.toggle('hidden', isNew);

  renderWordRows(list.words);
}

export function renderWordRows(words) {
  const container = $('#word-rows');
  container.innerHTML = '';

  words.forEach((word, i) => {
    const row = document.createElement('div');
    row.className = 'word-row';
    row.dataset.wordId = word.id;
    row.innerHTML = `
      <span class="word-row-number">${i + 1}.</span>
      <input type="text" class="word-text" value="${escapeHtml(word.text)}" placeholder="Ord" />
      <input type="text" class="word-hint" value="${escapeHtml(word.hint || '')}" placeholder="Ledtråd (valfritt)" />
      <button class="btn-remove-word" aria-label="Ta bort ord" ${words.length <= 1 ? 'disabled' : ''}>&times;</button>
    `;
    container.appendChild(row);
  });
}

export function getEditorData() {
  const rows = document.querySelectorAll('#word-rows .word-row');
  const words = [];
  rows.forEach((row) => {
    words.push({
      id: row.dataset.wordId,
      text: row.querySelector('.word-text').value,
      hint: row.querySelector('.word-hint').value,
    });
  });

  return {
    name: $('#list-name').value,
    language: $('#list-language').value,
    words,
  };
}

// ===== MODE SELECTOR =====

export function renderModeSelector(list) {
  $('#mode-title').textContent = list.name || 'Öva';
}

// ===== PRACTICE VIEW =====

export function renderPracticeWord(wordIndex, total, listName, mode) {
  $('#practice-title').textContent = listName;
  $('#practice-counter').textContent = `Ord ${wordIndex + 1} av ${total}`;
  $('#progress-bar').style.width = `${((wordIndex) / total) * 100}%`;

  // Reset
  hide('#feedback-area');
  hide('#star-container');
  hide('#diff-display');
  hide('#reveal-display');
  hide('#self-assess');
  hide('#practice-nav');
  $('#practice-input').value = '';

  if (mode === 'computer') {
    show('#practice-input-area');
    hide('#practice-paper-area');
    $('#practice-input').focus();
  } else {
    hide('#practice-input-area');
    show('#practice-paper-area');
  }
}

export function showCorrectFeedback() {
  show('#feedback-area');
  show('#star-container');
  hide('#diff-display');
  hide('#reveal-display');
  hide('#self-assess');
  show('#practice-nav');
  hide('#btn-try-again');

  playStarAnimation();
}

export function showIncorrectFeedback(diffResult, correctWord) {
  show('#feedback-area');
  hide('#star-container');
  show('#diff-display');
  hide('#reveal-display');
  hide('#self-assess');
  show('#practice-nav');
  show('#btn-try-again');

  renderDiff(diffResult);
  $('#feedback-correct-word').textContent = correctWord;
}

export function showRevealedWord(word) {
  show('#feedback-area');
  hide('#star-container');
  hide('#diff-display');
  show('#reveal-display');
  show('#self-assess');
  hide('#practice-nav');

  $('#revealed-word').textContent = word;
}

function renderDiff(diffResult) {
  const container = $('#diff-chars');
  container.innerHTML = '';

  for (const { char, status } of diffResult) {
    const span = document.createElement('span');
    span.textContent = char;
    span.className = `diff-char diff-${status}`;
    container.appendChild(span);
  }
}

function playStarAnimation() {
  const container = $('#star-container');
  container.innerHTML = '';
  show(container);

  // Main star
  const star = document.createElement('img');
  star.src = 'assets/star.svg';
  star.className = 'star-main';
  star.alt = 'Guldstjärna!';
  container.appendChild(star);

  // Particles
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const distance = 60 + Math.random() * 40;
    const particle = document.createElement('img');
    particle.src = 'assets/star.svg';
    particle.className = 'star-particle';
    particle.style.setProperty('--dx', Math.cos(angle) * distance);
    particle.style.setProperty('--dy', Math.sin(angle) * distance);
    particle.style.animationDelay = `${Math.random() * 0.3}s`;
    container.appendChild(particle);
  }
}

// ===== SUMMARY VIEW =====

export function renderSummary(results) {
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;

  // Render stars
  const starsContainer = $('#summary-stars');
  starsContainer.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const star = document.createElement('img');
    star.src = 'assets/star.svg';
    star.className = `summary-star ${i < correct ? 'earned' : ''}`;
    star.style.animationDelay = `${i * 0.15}s`;
    star.alt = i < correct ? 'Guldstjärna' : 'Tom stjärna';
    starsContainer.appendChild(star);
  }

  // Text
  $('#summary-text').textContent = `${correct} av ${total} rätt!`;

  // Encouraging message
  const ratio = correct / total;
  let msg;
  if (ratio === 1) {
    msg = 'Fantastiskt! Alla rätt! Du är en stjärna!';
  } else if (ratio >= 0.8) {
    msg = 'Jättebra jobbat! Nästan alla rätt!';
  } else if (ratio >= 0.5) {
    msg = 'Bra jobbat! Fortsätt öva så blir det ännu bättre!';
  } else {
    msg = 'Bra att du övar! Varje gång lär du dig lite mer!';
  }
  $('#summary-message').textContent = msg;
}

// ===== SETTINGS VIEW =====

export function renderSettings(settings) {
  $('#settings-apikey').value = settings.openaiApiKey || '';
  $('#settings-voice').value = settings.ttsVoice || 'nova';
  $('#settings-model').value = settings.ttsModel || 'gpt-4o-mini-tts';
  $('#settings-language').value = settings.defaultLanguage || 'sv';
  $('#apikey-status').textContent = '';
  $('#apikey-status').className = 'field-status';
}

export function showApiKeyStatus(message, isSuccess) {
  const el = $('#apikey-status');
  el.textContent = message;
  el.className = `field-status ${isSuccess ? 'success' : 'error'}`;
}

export function getSettingsData() {
  return {
    openaiApiKey: $('#settings-apikey').value.trim(),
    ttsVoice: $('#settings-voice').value,
    ttsModel: $('#settings-model').value,
    defaultLanguage: $('#settings-language').value,
  };
}

// ===== UTILS =====

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
