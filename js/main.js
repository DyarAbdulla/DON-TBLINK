/**
 * main.js — Entry point → AI Challenge Hub
 */
(function () {
  'use strict';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GameHub.boot());
  } else {
    GameHub.boot();
  }
})();
