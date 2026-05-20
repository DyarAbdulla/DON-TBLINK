/**
 * i18n.js — English + Kurdish Sorani (RTL)
 */

const TRANSLATIONS = {
  en: {
    loading: 'INITIALIZING',
    loadingSub: 'Calibrating neural eye tracker…',
    tagline: 'Viral AI Challenge',
    keepOpen: 'Keep Your Eyes Open',
    instructions: "Don't blink — not even once. The AI is tracking every frame.",
    startChallenge: 'Start Challenge',
    bestScore: 'Best Score',
    tryAgain: 'Try Again',
    youFailed: 'You Failed',
    blinkDetected: 'Blink Detected',
    cameraNote: 'Camera Access Required',
    cameraRequired: 'Camera Access Required. Please allow camera permission in your browser settings.',
    leaderboard: 'Leaderboard',
    localScores: 'Your Scores',
    survived: 'Survived',
    rank: 'Rank',
    watching: 'AI is Watching',
    dontBlink: 'DO NOT BLINK',
    madeWith: 'AI + Webcam',
    yourTime: 'Your Time',
    shareResult: 'Share Result',
    copied: 'Copied to clipboard!',
    shareTitle: "DON'T BLINK",
    faceLost: 'Face not detected — look at the camera',
    calibrating: 'CAL…',
    httpsRequired: 'Camera requires HTTPS. Use the published website link — opening index.html as a file will not work on mobile.',
    lbEmpty: 'Play to set your first record!',
    rankSleepy: 'Sleepy',
    rankHuman: 'Human',
    rankMachine: 'Machine',
    rankMonster: 'AI Monster',
    rankNone: '—',
    memes: [
      'Your eyes said: "I need moisture."',
      'One blink. One L. Instant regret.',
      'The AI is disappointed in your eyelids.',
      'Were you winking or losing?',
      'Even machines don\'t blink. Be better.',
      'That blink just cost you your streak.',
      'POV: You lost to your own face.',
    ],
    shareText: (t) => `I survived ${t}s without blinking on DON'T BLINK! Can you beat me?`,
  },
  ku: {
    loading: 'ئامادەکردن...',
    loadingSub: 'لە ڕێکخستنی شوێنگرەوەی چاودایە...',
    tagline: 'بەرەنگارییە ڤایرەڵییەکەی AI',
    keepOpen: 'چاوەکانت بە کراوەیی بهێڵەرەوە',
    instructions: 'چاو مەتروکێنە — تەنانەت یەک جاریش. AI چاودێری هەموو چرکەیەک دەکات.',
    startChallenge: 'دەستپێکردنی بەرەنگاری',
    bestScore: 'باشترین ئەنجام',
    tryAgain: 'دووبارە هەوڵبدەرەوە',
    youFailed: 'دۆڕایت',
    blinkDetected: 'تروکاندنی چاو هەستی پێکرا',
    cameraNote: 'ڕێگەپێدانی کامێرا پێویستە',
    cameraRequired: 'ڕێگەپێدانی کامێرا پێویستە. تکایە لە ڕێکخستنەکانی وێبگەڕەکەتەوە ڕێگە بە بەکارهێنانی کامێرا بدە.',
    leaderboard: 'لیستی باشترینەکان',
    localScores: 'ئەنجامەکانت',
    survived: 'بەرگەگرتن',
    rank: 'پلە',
    watching: 'AI چاودێریت دەکات',
    dontBlink: 'چاو مەتروکێنە',
    madeWith: 'AI + کامێرا',
    yourTime: 'کاتی تۆ',
    shareResult: 'ئەنجامەکەت بڵاوبکەرەوە',
    copied: 'کۆپیکرا بۆ کلیپبۆرد!',
    shareTitle: 'چاو مەتروکێنە',
    faceLost: 'ڕووخسار نەدۆزرایەوە — سەیری کامێراکە بکە',
    calibrating: 'ڕێکخستن...',
    httpsRequired: 'کامێرا پێویستی بە HTTPS هەیە. لینکی وێبسایتە بڵاوکراوەکە بەکاربهێنە — کردنەوەی index.html وەک فایل لەسەر مۆبایل کار ناکات.',
    lbEmpty: 'یاری بکە بۆ تۆمارکردنی یەکەم ژمارەی پێوانەییت!',
    rankSleepy: 'خەواڵوو',
    rankHuman: 'مرۆڤ',
    rankMachine: 'ئامێر',
    rankMonster: 'دڕندەی AI',
    rankNone: '—',
    memes: [
      'چاوەکانت وتیان: "پێویستمان بە شێدارکردنەوەیە."',
      'یەک چاو تروکاندن. یەک دۆڕان. پەشیمانییەکی خێرا.',
      'AI لە پێڵووی چاوەکانت بێهیوایە.',
      'چاوت داگرت یان دۆڕایت؟',
      'تەنانەت ئامێرەکانیش چاو ناترۆکێنن. باشتر بە.',
      'ئەو چاو تروکاندنە بووە هۆی لەدەستدانی زنجیرەی بردنەوەکانت.',
      'لەو گۆشەیەوە: بە ڕووخساری خۆت دۆڕایت.',
    ],
    shareText: (t) => `من بەرگەی ${t} چرکەم گرت بەبێ چاو تروکاندن لە "چاو مەتروکێنە"! دەتوانیت لێم ببەیتەوە؟`,
  },
};

let currentLang = localStorage.getItem('dontblink-lang') || 'en';

function t(key) {
  return TRANSLATIONS[currentLang][key] ?? TRANSLATIONS.en[key] ?? key;
}

function getRandomMeme() {
  const memes = TRANSLATIONS[currentLang].memes;
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
}

window.i18n = {
  t,
  getRandomMeme,
  toggleLanguage,
  applyTranslations,
  get currentLang() { return currentLang; },
  shareText: (time) => TRANSLATIONS[currentLang].shareText(time),
};