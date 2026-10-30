'use strict';

// A live server stamps its HTML with the loaded presentation version. Static
// exports have no stamp, so this module stays inert in snapshots and offline files.
window.LumiWorkspaceUpdate = window.LumiWorkspaceUpdate || (() => {
  const INTERVAL = 120000, MAX_BACKOFF = 900000;
  const valid = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  let loadedVersion = '', nextCheck = 0, failures = 0, timer = null;
  let controller = null, requestTimeout = null, stopped = false, changed = false, started = false;

  function clearTimers() {
    clearTimeout(timer);timer = null;
    clearTimeout(requestTimeout);requestTimeout = null;
  }
  function available() {
    return !stopped && !changed && document.visibilityState !== 'hidden' && navigator.onLine !== false;
  }
  function schedule() {
    clearTimeout(timer);timer = null;
    if (available()) timer = setTimeout(check, Math.max(0, nextCheck - Date.now()));
  }
  function notice() {
    if (document.getElementById('workspace-update-notice')) return;
    const style = document.createElement('style');style.id = 'workspace-update-style';
    style.textContent = '#workspace-update-notice{position:fixed;z-index:900;bottom:20px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:16px;box-sizing:border-box;max-width:calc(100vw - 32px);padding:13px 18px;border:1px solid #b8d9db;border-radius:10px;background:#f3fbfb;color:#16394a;box-shadow:0 5px 24px #142b4226;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#workspace-update-notice button{flex:none;border:0;border-radius:6px;background:#176d75;color:#fff;padding:8px 12px;font:inherit;cursor:pointer}#workspace-update-notice button:focus-visible{outline:3px solid #3b82f6;outline-offset:3px}@media(max-width:480px){#workspace-update-notice{width:calc(100vw - 32px);gap:10px;padding:12px}}';
    const box = document.createElement('aside');box.id = 'workspace-update-notice';
    box.setAttribute('role', 'status');box.setAttribute('aria-live', 'polite');
    const text = document.createElement('span');text.textContent = '工作台已更新，刷新后生效';
    const button = document.createElement('button');button.type = 'button';button.textContent = '刷新工作台';
    button.title = '请先保存当前填写的内容，再刷新';
    button.addEventListener('click', () => location.reload());
    box.append(text, button);document.head.append(style);document.body.append(box);
  }
  async function check() {
    clearTimeout(timer);timer = null;
    if (!available() || controller) return;
    if (Date.now() < nextCheck) {schedule();return;}
    const ownController = new AbortController();controller = ownController;
    requestTimeout = setTimeout(() => ownController.abort(), 15000);
    try {
      const response = await fetch('/api/ui-version', {
        method:'GET',credentials:'same-origin',cache:'no-store',signal:ownController.signal,
        headers:{Accept:'application/json'},
      });
      if (!response.ok) throw new Error('version_unavailable');
      const payload = await response.json();
      if (!valid(payload?.version)) throw new Error('invalid_version');
      if (stopped || ownController.signal.aborted) return;
      failures = 0;nextCheck = Date.now() + INTERVAL;
      if (payload.version !== loadedVersion) {changed = true;notice();}
    } catch {
      if (!stopped) {
        failures = Math.min(failures + 1, 4);
        nextCheck = Date.now() + Math.min(MAX_BACKOFF, INTERVAL * 2 ** failures);
      }
    } finally {
      clearTimeout(requestTimeout);requestTimeout = null;
      if (controller === ownController) controller = null;
      schedule();
    }
  }
  function wake() {if (started) schedule();}
  function pause() {clearTimers();controller?.abort();}
  function stop() {
    stopped = true;pause();
    document.removeEventListener('visibilitychange', wake);
    window.removeEventListener('online', wake);
    window.removeEventListener('offline', pause);
    window.removeEventListener('pagehide', pause);
    window.removeEventListener('pageshow', wake);
  }
  function start() {
    if (started || stopped || !['http:','https:'].includes(location.protocol)) return;
    const version = document.querySelector('meta[name="lumipilot-ui-version"]')?.content;
    if (!valid(version)) return;
    loadedVersion = version;started = true;
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);window.addEventListener('offline', pause);
    window.addEventListener('pagehide', pause);window.addEventListener('pageshow', wake);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
  return {stop};
})();
