import { getSettings } from './store.js';

const AUDIO_CACHE = new Map();

async function speakWithOpenAI(text, language, settings) {
  const cacheKey = `${language}:${text}`;
  let audioBlob = AUDIO_CACHE.get(cacheKey);

  if (!audioBlob) {
    const instructions =
      language === 'sv'
        ? 'Tala tydligt på svenska. Uttala ordet långsamt och distinkt, som om du talar med ett barn som övar stavning.'
        : 'Speak clearly in English. Pronounce the word slowly and distinctly, as if speaking to a child practicing spelling.';

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.ttsModel || 'gpt-4o-mini-tts',
        voice: settings.ttsVoice || 'nova',
        input: text,
        instructions,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    audioBlob = await response.blob();
    AUDIO_CACHE.set(cacheKey, audioBlob);
  }

  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = reject;
    audio.play();
  });
}

function speakWithWebSpeech(text, language) {
  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'sv' ? 'sv-SE' : 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.onend = resolve;
    utterance.onerror = reject;
    window.speechSynthesis.speak(utterance);
  });
}

export async function speak(text, language) {
  const settings = getSettings();

  if (settings.openaiApiKey) {
    try {
      return await speakWithOpenAI(text, language, settings);
    } catch (err) {
      console.warn('OpenAI TTS failed, falling back to Web Speech:', err);
    }
  }

  return speakWithWebSpeech(text, language);
}

export async function testApiKey(apiKey) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'nova',
      input: 'Hej! Rösten fungerar.',
      instructions: 'Tala tydligt på svenska.',
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    throw new Error(`API-fel: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  audio.play();
}
