(() => {
  'use strict';

  // Count the public entry page, including entries that continue to a sign-in.
  // No cookies, local identifiers, referrers, filenames or form values are sent.
  const project = document.currentScript?.dataset.project;
  const projects = ['lumipilot', 'market-console', 'tospo', 'lumina', 'vietquest', 'wanchao', 'pdf-cad'];
  if (location.origin !== 'https://dayang1847-arch.github.io' || !projects.includes(project)) return;
  const seen = window.__dcRecordedEntries || (window.__dcRecordedEntries = new Set());
  if (seen.has(project) || !window.crypto?.getRandomValues || typeof window.fetch !== 'function') return;
  seen.add(project);

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const eventId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  fetch('https://dc-workspaces-access.dayang0509.chatgpt.site/_metrics/views', {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    keepalive: true,
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify({project, eventId}),
  }).catch(() => {});
})();
