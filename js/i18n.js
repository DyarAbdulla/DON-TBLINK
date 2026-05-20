/**
 * i18n.js — English + Kurdish Sorani
 */

const TRANSLATIONS = {
  en: {
    loading: 'INITIALIZING',
    loadingSub: 'Loading AI facial tracking systems…',
    hubTitle: 'AI CHALLENGE HUB',
    hubSubtitle: 'Webcam-powered viral challenges',
    modeBlink: "DON'T BLINK",
    modeBlinkDesc: 'Survive without blinking. AI tracks your eyes.',
    modeLaugh: "DON'T LAUGH",
    modeLaughDesc: 'Keep a straight face. AI detects every smile.',
    play: 'Play',
    backHub: '← Hub',
    tagline: 'Viral AI Challenge',
    keepOpen: 'Keep Your Eyes Open',
    keepSerious: 'Keep a Straight Face',
    instructions: "Don't blink — not even once. The AI is tracking every frame.",
    laughInstructions: "Don't smile or laugh. The AI is watching your mouth.",
    startChallenge: 'Start Challenge',
    bestScore: 'Best Score',
    tryAgain: 'Try Again',
    youFailed: 'You Failed',
    laughFailed: 'You Laughed',
    blinkDetected: 'Blink Detected',
    laughDetected: 'Smile Detected',
    cameraNote: 'Camera Access Required',
    cameraRequired: 'Camera Access Required. Please allow camera permission.',
    leaderboard: 'Leaderboard',
    localScores: 'Your Scores',
    survived: 'Survived',
    rank: 'Rank',
    watching: 'AI is Watching',
    dontBlink: 'DO NOT BLINK',
    dontLaugh: 'DO NOT LAUGH',
    madeWith: 'AI + Webcam',
    yourTime: 'Your Time',
    shareResult: 'Share Result',
    copied: 'Copied to clipboard!',
    shareTitle: "DON'T BLINK",
    faceLost: 'Face not detected',
    calibrating: 'CAL…',
    metricEar: 'EAR',
    metricSmile: 'SMILE',
    httpsRequired: 'Camera requires HTTPS. Use your published Cloudflare URL.',
    lbEmpty: 'Play to set your first record!',
    rankSleepy: 'Sleepy',
    rankHuman: 'Human',
    rankMachine: 'Machine',
    rankMonster: 'AI Monster',
    rankNone: '—',
    laughPrompts: [
      'Why did the AI go to therapy? Too many blinks.',
      'Your face is 90% straight, 10% trying not to laugh.',
      'Imagine your crush watching this live.',
      'POV: You remembered something funny 3 seconds ago.',
    ],
    memes: [
      'Your eyes said: "I need moisture."',
      'One blink. One L. Instant regret.',
      'The AI is disappointed in your eyelids.',
      'Were you winking or losing?',
      'Even machines don\'t blink. Be better.',
      'That blink just cost you your streak.',
      'POV: You lost to your own face.',
    ],
    laughMemes: [
      'That smirk was illegal in 7 countries.',
      'You laughed. The AI is judging silently.',
      'Straight face? You had ONE job.',
      'Comedy defeated you in 4.2 seconds.',
      'Your mouth betrayed you.',
    ],
    shareText: (t) => `I survived ${t}s without blinking! Can you beat me?`,
    laughShareText: (t) => `I held a straight face for ${t}s on DON'T LAUGH!`,
  },
  ku: {
    loading: 'ئامادەکردن...',
    loadingSub: 'سیستەمەکانی شوێنگرەوەی دەموچاو بار دەکرێن...',
    hubTitle: 'ناوەندی بەرەنگاریی AI',
    hubSubtitle: 'بەرەنگارییە ڤایرەڵەکان بە کامێرا',
    modeBlink: 'چاو مەتروکێنە',
    modeBlinkDesc: 'بەبێ تروکاندنی چاو بەرگە بگرە.',
    modeLaugh: 'پێکەنین مەکە',
    modeLaughDesc: 'دەم و چاو ڕاست بهێڵەوە. AI پێکەنین دەبینێت.',
    play: 'یاری',
    backHub: '← ناوەند',
    tagline: 'بەرەنگاریی AI',
    keepOpen: 'چاوەکانت بە کراوەیی بهێڵەرەوە',
    keepSerious: 'دەم و چاوەکانت ڕاست بهێڵەرەوە',
    instructions: 'چاو مەتروکێنە — تەنانەت یەک جاریش.',
    laughInstructions: 'پێکەنین مەکە و پێبخند. AI چاودێری دەمەکەت دەکات.',
    startChallenge: 'دەستپێکردنی بەرەنگاری',
    bestScore: 'باشترین ئەنجام',
    tryAgain: 'دووبارە هەوڵبدەرەوە',
    youFailed: 'دۆڕایت',
    laughFailed: 'پێکت هێنا',
    blinkDetected: 'تروکاندنی چاو هەستی پێکرا',
    laughDetected: 'پێکەنین هەستی پێکرا',
    cameraNote: 'ڕێگەپێدانی کامێرا پێویستە',
    cameraRequired: 'ڕێگەپێدانی کامێرا پێویستە.',
    leaderboard: 'لیستی باشترینەکان',
    localScores: 'ئەنجامەکانت',
    survived: 'بەرگەگرتن',
    rank: 'پلە',
    watching: 'AI چاودێریت دەکات',
    dontBlink: 'چاو مەتروکێنە',
    dontLaugh: 'پێکەنین مەکە',
    madeWith: 'AI + کامێرا',
    yourTime: 'کاتەکەت',
    shareResult: 'هاوبەشی ئەنجام',
    copied: 'کۆپیکرا!',
    shareTitle: 'چاو مەتروکێنە',
    faceLost: 'ڕووخسار نەدۆزرایەوە',
    calibrating: 'ڕێکخستن...',
    metricEar: 'EAR',
    metricSmile: 'پێکەنین',
    httpsRequired: 'کامێرا پێویستی بە HTTPS هەیە.',
    lbEmpty: 'یاری بکە بۆ یەکەم تۆمار!',
    rankSleepy: 'خەواڵوو',
    rankHuman: 'مرۆڤ',
    rankMachine: 'ئامێر',
    rankMonster: 'دڕندەی AI',
    rankNone: '—',
    laughPrompts: [
      'بۆچی AI چوو بۆ چارەسەر؟ زۆر تروکاندنی چاو.',
      'ڕووخسارت ٩٠٪ ڕاستە، ١٠٪ هەوڵی پێکەنین نەکردن.',
      'وەک خەیاڵ بکە کە خۆشەویستەکەت سەیری دەکات.',
    ],
    memes: [
      'چاوەکانت وتیان: "پێویستمان بە شێدارکردنەوەیە."',
      'یەک چاو تروکاندن. یەک دۆڕان.',
      'AI لە پێڵووی چاوەکانت بێهیوایە.',
    ],
    laughMemes: [
      'ئەو پێکەنینە نایاسایی بوو.',
      'پێکت هێنا. AI بێدەنگ حوکم دەردەکات.',
      'دەم و چاو ڕاست؟ تەنها یەک کار هەبوو.',
    ],
    shareText: (t) => `من ${t} چرکە بەبێ تروکاندن مامەوە!`,
    laughShareText: (t) => `من ${t} چرکە دەم و چاوم ڕاست مامەوە!`,
  },
};

let currentLang = localStorage.getItem('dontblink-lang') || 'en';

function t(key) {
  const v = TRANSLATIONS[currentLang][key] ?? TRANSLATIONS.en[key];
  return v ?? key;
}

function getRandomMeme(pool = 'memes') {
  const memes = TRANSLATIONS[currentLang][pool] || TRANSLATIONS.en[pool];
  return memes[Math.floor(Math.random() * memes.length)];
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = TRANSLATIONS[currentLang][key];
    if (val && typeof val === 'string') el.textContent = val;
  });
  document.documentElement.lang = currentLang === 'ku' ? 'ckb' : 'en';
  document.documentElement.dir = currentLang === 'ku' ? 'rtl' : 'ltr';
  const langLabel = document.getElementById('lang-label');
  if (langLabel) langLabel.textContent = currentLang === 'en' ? 'KU' : 'EN';
}

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'ku' : 'en';
  localStorage.setItem('dontblink-lang', currentLang);
  applyTranslations();
  if (typeof renderLeaderboard === 'function') renderLeaderboard();
  if (typeof GameHub?.rotateLaughPrompt === 'function') GameHub.rotateLaughPrompt();
}

function getLaughPrompts() {
  return TRANSLATIONS[currentLang].laughPrompts || TRANSLATIONS.en.laughPrompts;
}

window.i18n = {
  t,
  getRandomMeme,
  getLaughPrompts,
  toggleLanguage,
  applyTranslations,
  get currentLang() { return currentLang; },
  shareText: (time) => TRANSLATIONS[currentLang].shareText(time),
  laughShareText: (time) => TRANSLATIONS[currentLang].laughShareText(time),
};
