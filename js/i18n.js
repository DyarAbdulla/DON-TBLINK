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
    loadingSub: 'سیستەمی چاوی زیرەکی دەستکرد ڕێکدەخرێت...',
    tagline: 'یاری وایرەڵی AI',
    keepOpen: 'چاوەکانت کراوە بهێڵەوە',
    instructions: 'پلک مەدە — تەنانەت جارێکیش. زیرەکی دەستکرد هەر وێنەیەک دەپشکنێت.',
    startChallenge: 'دەستپێکردنی یاری',
    bestScore: 'باشترین سکۆر',
    tryAgain: 'دووبارە هەوڵ بدەرەوە',
    youFailed: 'شکستی هێنا',
    blinkDetected: 'پلکدان دۆزرایەوە',
    cameraNote: 'پێویستە کامێرا چالاک بکرێت',
    cameraRequired: 'پێویستە کامێرا چالاک بکرێت. تکایە ڕێگە بە کامێرا بدە لە ڕێکخستنەکانی وێبگەڕەکەت.',
    leaderboard: 'خشتەی پێشەنگان',
    localScores: 'سکۆرەکانت',
    survived: 'مانەوە',
    rank: 'پلە',
    watching: 'زیرەکی دەستکرد چاودێریت دەکات',
    dontBlink: 'پلک مەدە',
    madeWith: 'AI + کامێرا',
    yourTime: 'کاتەکەت',
    shareResult: 'هاوبەشی سکۆر',
    copied: 'لە کلیپبۆردە کۆپی کرا!',
    shareTitle: 'پلک مەدە',
    faceLost: 'ڕووخسار نەدۆزرایەوە — سەیری کامێرا بکە',
    calibrating: 'ئامادەکردن…',
    httpsRequired: 'کامێرا پێویستی بە HTTPS هەیە. لینکی وێبسایتەکە بەکاربهێنە — کردنەوەی فایلەکە وەک فایل کارناکات لە مۆبایل.',
    lbEmpty: 'یاری بکە بۆ تۆمارکردنی یەکەم سکۆر!',
    rankSleepy: 'خەواڵو',
    rankHuman: 'مرۆڤ',
    rankMachine: 'ئامێر',
    rankMonster: 'ئەهریمەنی AI',
    rankNone: '—',
    memes: [
      'چاوەکانت گوتیان: "پێویستم بە شلەیی هەیە."',
      'یەک پلک. یەک شکست. یەک ئازار.',
      'زیرەکی دەستکرد نائومێدە لە پلکەکانی چاوت.',
      'چاوت دەمکوت؟ یان شکستت هێنا؟',
      'تەنانەت ئامێرەکان پلک نادەن. باشتر بە.',
      'ئەو پلکدانە زنجیرەکەت تێکشکاند.',
      'POV: شکستت هێنا لە دەمچاوەکانت.',
    ],
    shareText: (t) => `من ${t} چرکە بەبێ پلکدان مامەوە لە "پلک مەدە"! دەتوانیت لە من باشتر بیت؟`,
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
