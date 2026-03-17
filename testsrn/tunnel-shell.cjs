const http = require('http');
const { spawn, execSync } = require('child_process');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = 5274;
const sessions = new Map();

function createShell() {
  const isDocker = fs.existsSync('/.dockerenv');
  let shell;
  if (isDocker) {
    shell = spawn('/bin/bash', ['-i'], { env: { ...process.env, TERM: 'xterm-256color' } });
  } else {
    let hasDocker = false;
    try { execSync('which docker', { stdio: 'ignore' }); hasDocker = true; } catch {}
    if (hasDocker) {
      shell = spawn('docker', ['run', '--rm', '-i', 'ubuntu:latest', '/bin/bash'], { env: { ...process.env, TERM: 'xterm-256color' } });
    } else {
      shell = spawn('/bin/bash', ['-i'], { env: { ...process.env, TERM: 'xterm-256color' } });
    }
  }
  return shell;
}

function getFileList(dirPath) {
  try {
    const resolved = path.resolve(dirPath);
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const items = entries.map(e => ({
      name: e.name,
      isDir: e.isDirectory(),
      isSymlink: e.isSymbolicLink(),
      size: 0,
      modified: '',
    }));
    for (const item of items) {
      try {
        const st = fs.statSync(path.join(resolved, item.name));
        item.size = st.size;
        item.modified = st.mtime.toISOString();
      } catch {}
    }
    items.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
    return { path: resolved, items, error: null };
  } catch (err) {
    return { path: dirPath, items: [], error: err.message };
  }
}

function readFileContent(filePath) {
  try {
    const resolved = path.resolve(filePath);
    const stat = fs.statSync(resolved);
    if (stat.size > 2 * 1024 * 1024) return { content: null, error: 'File too large (>2MB)', path: resolved };
    const content = fs.readFileSync(resolved, 'utf-8');
    return { content, error: null, path: resolved, size: stat.size };
  } catch (err) {
    return { content: null, error: err.message, path: filePath };
  }
}

function deleteFileOrDir(targetPath) {
  try {
    const resolved = path.resolve(targetPath);
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      fs.rmSync(resolved, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolved);
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function renameItem(oldPath, newName) {
  try {
    const resolvedOld = path.resolve(oldPath);
    const dir = path.dirname(resolvedOld);
    const resolvedNew = path.join(dir, newName);
    fs.renameSync(resolvedOld, resolvedNew);
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function createDir(dirPath) {
  try {
    fs.mkdirSync(path.resolve(dirPath), { recursive: true });
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function writeFileContent(filePath, content) {
  try {
    const resolved = path.resolve(filePath);
    fs.writeFileSync(resolved, content, 'utf-8');
    return { success: true, error: null, path: resolved };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Serfy</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css">
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #1c2128;
      --bg-hover: #1f2937;
      --border: #30363d;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --accent: #58a6ff;
      --accent-dim: #1f6feb;
      --green: #3fb950;
      --red: #f85149;
      --orange: #d29922;
      --purple: #bc8cff;
      --radius: 8px;
      --safe-bottom: env(safe-area-inset-bottom, 0px);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      -webkit-tap-highlight-color: transparent;
    }

    /* Top bar */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      min-height: 48px;
      flex-shrink: 0;
      gap: 8px;
    }
    .topbar .brand {
      font-weight: 700;
      font-size: 18px;
      color: var(--accent);
      letter-spacing: 1px;
    }
    .topbar-actions { display: flex; gap: 4px; }
    .topbar-actions button {
      background: none; border: none; color: var(--text-secondary); font-size: 22px;
      width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius); cursor: pointer; transition: background 0.15s;
    }
    .topbar-actions button:hover, .topbar-actions button.active {
      background: var(--bg-hover); color: var(--text-primary);
    }
    .topbar-actions button.active { color: var(--accent); }

    /* Main layout */
    .main { flex: 1; display: flex; overflow: hidden; position: relative; }

    /* Side panel */
    .side-panel {
      position: absolute; top: 0; left: 0; bottom: 0; width: 300px;
      max-width: 85vw; background: var(--bg-secondary); border-right: 1px solid var(--border);
      z-index: 20; transform: translateX(-100%); transition: transform 0.25s ease;
      display: flex; flex-direction: column;
    }
    .side-panel.open { transform: translateX(0); }
    .side-panel-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); z-index: 19; display: none;
    }
    .side-panel-overlay.show { display: block; }

    @media (min-width: 768px) {
      .side-panel {
        position: relative; transform: none; width: 0;
        transition: width 0.25s ease; overflow: hidden;
      }
      .side-panel.open { width: 300px; }
      .side-panel-overlay { display: none !important; }
    }

    /* Panel sections */
    .panel-tabs {
      display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .panel-tab {
      flex: 1; padding: 10px 8px; text-align: center; font-size: 13px; font-weight: 500;
      color: var(--text-secondary); border: none; background: none; cursor: pointer;
      border-bottom: 2px solid transparent; transition: all 0.15s;
    }
    .panel-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .panel-tab:hover { color: var(--text-primary); background: var(--bg-hover); }

    .panel-content { flex: 1; overflow-y: auto; }

    /* File manager */
    .file-toolbar {
      display: flex; align-items: center; gap: 4px; padding: 8px;
      border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .file-toolbar button {
      background: none; border: none; color: var(--text-secondary); font-size: 18px;
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      border-radius: 6px; cursor: pointer;
    }
    .file-toolbar button:hover { background: var(--bg-hover); color: var(--text-primary); }
    .file-path {
      flex: 1; font-size: 11px; color: var(--text-muted); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; direction: rtl; text-align: left;
      padding: 0 4px;
    }
    .file-list { list-style: none; }
    .file-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      cursor: pointer; font-size: 13px; border-bottom: 1px solid var(--border);
      transition: background 0.1s;
    }
    .file-item:hover { background: var(--bg-hover); }
    .file-item:active { background: var(--bg-tertiary); }
    .file-item .icon { font-size: 18px; flex-shrink: 0; }
    .file-item .icon.folder { color: var(--accent); }
    .file-item .icon.file { color: var(--text-muted); }
    .file-item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-item .meta { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
    .file-item-actions {
      display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s;
    }
    .file-item:hover .file-item-actions { opacity: 1; }
    @media (max-width: 767px) { .file-item-actions { opacity: 1; } }
    .file-item-actions button {
      background: none; border: none; color: var(--text-muted); font-size: 16px;
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border-radius: 4px; cursor: pointer;
    }
    .file-item-actions button:hover { background: var(--bg-primary); color: var(--text-primary); }
    .file-item-actions button.danger:hover { color: var(--red); }

    /* Sessions */
    .session-list { list-style: none; }
    .session-item {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.1s;
    }
    .session-item:hover { background: var(--bg-hover); }
    .session-item.active { background: var(--bg-tertiary); border-left: 3px solid var(--accent); }
    .session-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
    .session-dot.dead { background: var(--red); }
    .session-info { flex: 1; min-width: 0; }
    .session-name { font-size: 13px; font-weight: 500; }
    .session-detail { font-size: 11px; color: var(--text-muted); }
    .session-actions button {
      background: none; border: none; color: var(--text-muted); font-size: 18px;
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      border-radius: 6px; cursor: pointer;
    }
    .session-actions button:hover { color: var(--red); background: var(--bg-primary); }
    .new-session-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px; margin: 8px; border-radius: var(--radius);
      background: var(--accent-dim); color: #fff; border: none; cursor: pointer;
      font-size: 13px; font-weight: 500; transition: background 0.15s;
    }
    .new-session-btn:hover { background: var(--accent); }

    /* Terminal area */
    .terminal-area {
      flex: 1; display: flex; flex-direction: column; min-width: 0;
    }
    .terminal-tabs {
      display: flex; background: var(--bg-secondary); border-bottom: 1px solid var(--border);
      overflow-x: auto; flex-shrink: 0; scrollbar-width: none;
    }
    .terminal-tabs::-webkit-scrollbar { display: none; }
    .term-tab {
      padding: 6px 14px; font-size: 12px; color: var(--text-secondary);
      border: none; background: none; cursor: pointer; white-space: nowrap;
      border-bottom: 2px solid transparent; transition: all 0.15s; flex-shrink: 0;
    }
    .term-tab.active { color: var(--accent); border-bottom-color: var(--accent); background: var(--bg-primary); }
    .term-tab:hover { color: var(--text-primary); }
    .term-tab .close-tab {
      margin-left: 6px; font-size: 14px; opacity: 0.5; vertical-align: middle;
    }
    .term-tab .close-tab:hover { opacity: 1; color: var(--red); }
    .terminal-container { flex: 1; position: relative; }
    .terminal-container .xterm { height: 100%; }
    .terminal-wrap {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: none; padding: 4px;
    }
    .terminal-wrap.active { display: block; }

    /* File viewer modal */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 50; display: none;
      align-items: center; justify-content: center; padding: 16px;
    }
    .modal-overlay.show { display: flex; }
    .modal {
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 12px; width: 100%; max-width: 700px;
      max-height: 85vh; display: flex; flex-direction: column;
      overflow: hidden;
    }
    .modal-header {
      display: flex; align-items: center; padding: 12px 16px;
      border-bottom: 1px solid var(--border); gap: 8px;
    }
    .modal-header .title { flex: 1; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .modal-header button {
      background: none; border: none; color: var(--text-secondary); font-size: 22px;
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      border-radius: 6px; cursor: pointer;
    }
    .modal-header button:hover { background: var(--bg-hover); color: var(--text-primary); }
    .modal-body {
      flex: 1; overflow: auto; padding: 0;
    }
    .modal-body pre {
      margin: 0; padding: 16px; font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-all;
      color: var(--text-primary);
    }
    .modal-footer {
      display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border);
      justify-content: flex-end;
    }
    .modal-footer button {
      padding: 6px 16px; border-radius: 6px; border: 1px solid var(--border);
      background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;
      cursor: pointer; transition: background 0.15s;
    }
    .modal-footer button:hover { background: var(--bg-hover); }
    .modal-footer button.primary { background: var(--accent-dim); border-color: var(--accent-dim); color: #fff; }
    .modal-footer button.primary:hover { background: var(--accent); }

    /* Prompt dialog */
    .prompt-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 60; display: none;
      align-items: center; justify-content: center; padding: 16px;
    }
    .prompt-overlay.show { display: flex; }
    .prompt-box {
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px; width: 100%; max-width: 400px;
    }
    .prompt-box h3 { font-size: 15px; margin-bottom: 12px; }
    .prompt-box input {
      width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border);
      background: var(--bg-primary); color: var(--text-primary); font-size: 14px;
      outline: none;
    }
    .prompt-box input:focus { border-color: var(--accent); }
    .prompt-box .prompt-actions {
      display: flex; gap: 8px; margin-top: 14px; justify-content: flex-end;
    }
    .prompt-box .prompt-actions button {
      padding: 6px 16px; border-radius: 6px; border: 1px solid var(--border);
      background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px; cursor: pointer;
    }
    .prompt-box .prompt-actions button.primary { background: var(--accent-dim); border-color: var(--accent-dim); color: #fff; }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
  </style>
</head>
<body>
  <div class="topbar">
    <span class="brand">SERFY</span>
    <div class="topbar-actions">
      <button id="btnSessions" title="Sessions"><i class="mdi mdi-console"></i></button>
      <button id="btnFiles" title="Files"><i class="mdi mdi-folder-outline"></i></button>
    </div>
  </div>

  <div class="main">
    <div class="side-panel-overlay" id="panelOverlay"></div>
    <div class="side-panel" id="sidePanel">
      <div class="panel-tabs">
        <button class="panel-tab active" data-tab="sessions"><i class="mdi mdi-console"></i> Sessions</button>
        <button class="panel-tab" data-tab="files"><i class="mdi mdi-folder"></i> Files</button>
      </div>
      <div class="panel-content" id="panelSessions">
        <ul class="session-list" id="sessionList"></ul>
        <button class="new-session-btn" id="btnNewSession"><i class="mdi mdi-plus"></i> New Session</button>
      </div>
      <div class="panel-content" id="panelFiles" style="display:none;">
        <div class="file-toolbar">
          <button id="btnFileUp" title="Go up"><i class="mdi mdi-arrow-up"></i></button>
          <button id="btnFileHome" title="Home"><i class="mdi mdi-home"></i></button>
          <button id="btnFileRefresh" title="Refresh"><i class="mdi mdi-refresh"></i></button>
          <span class="file-path" id="filePath"></span>
          <button id="btnNewFolder" title="New folder"><i class="mdi mdi-folder-plus-outline"></i></button>
          <button id="btnNewFile" title="New file"><i class="mdi mdi-file-plus-outline"></i></button>
        </div>
        <ul class="file-list" id="fileList"></ul>
      </div>
    </div>

    <div class="terminal-area">
      <div class="terminal-tabs" id="termTabs"></div>
      <div class="terminal-container" id="termContainer"></div>
    </div>
  </div>

  <!-- File viewer -->
  <div class="modal-overlay" id="fileModal">
    <div class="modal">
      <div class="modal-header">
        <i class="mdi mdi-file-document-outline" style="color:var(--accent);font-size:20px;"></i>
        <span class="title" id="fileModalTitle"></span>
        <button id="fileModalClose"><i class="mdi mdi-close"></i></button>
      </div>
      <div class="modal-body"><pre id="fileModalContent"></pre></div>
      <div class="modal-footer">
        <button id="fileModalEdit">Edit</button>
        <button id="fileModalDone" class="primary">Done</button>
      </div>
    </div>
  </div>

  <!-- Editor modal -->
  <div class="modal-overlay" id="editModal">
    <div class="modal" style="max-width:800px;">
      <div class="modal-header">
        <i class="mdi mdi-pencil" style="color:var(--orange);font-size:20px;"></i>
        <span class="title" id="editModalTitle"></span>
        <button id="editModalClose"><i class="mdi mdi-close"></i></button>
      </div>
      <div class="modal-body" style="padding:0;">
        <textarea id="editArea" style="width:100%;height:50vh;background:var(--bg-primary);color:var(--text-primary);border:none;padding:16px;font-family:'SF Mono','Fira Code',monospace;font-size:13px;line-height:1.5;resize:none;outline:none;"></textarea>
      </div>
      <div class="modal-footer">
        <button id="editModalCancel">Cancel</button>
        <button id="editModalSave" class="primary">Save</button>
      </div>
    </div>
  </div>

  <!-- Prompt dialog -->
  <div class="prompt-overlay" id="promptOverlay">
    <div class="prompt-box">
      <h3 id="promptTitle">Input</h3>
      <input id="promptInput" type="text" autocomplete="off">
      <div class="prompt-actions">
        <button id="promptCancel">Cancel</button>
        <button id="promptOk" class="primary">OK</button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
  <script>
  (() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsBase = proto + '://' + location.host;
    const sessions = [];
    let activeSession = null;
    let currentFilePath = null;
    let editingFilePath = null;

    // Panel management
    const sidePanel = document.getElementById('sidePanel');
    const panelOverlay = document.getElementById('panelOverlay');
    const btnSessions = document.getElementById('btnSessions');
    const btnFiles = document.getElementById('btnFiles');
    const panelTabs = document.querySelectorAll('.panel-tab');
    const panelSessions = document.getElementById('panelSessions');
    const panelFiles = document.getElementById('panelFiles');

    function openPanel(tab) {
      sidePanel.classList.add('open');
      panelOverlay.classList.add('show');
      switchTab(tab);
      if (tab === 'sessions') { btnSessions.classList.add('active'); btnFiles.classList.remove('active'); }
      else { btnFiles.classList.add('active'); btnSessions.classList.remove('active'); }
    }
    function closePanel() {
      sidePanel.classList.remove('open');
      panelOverlay.classList.remove('show');
      btnSessions.classList.remove('active');
      btnFiles.classList.remove('active');
    }
    function switchTab(tab) {
      panelTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      panelSessions.style.display = tab === 'sessions' ? '' : 'none';
      panelFiles.style.display = tab === 'files' ? '' : 'none';
      if (tab === 'files' && !currentFilePath) loadFiles(null);
    }

    btnSessions.onclick = () => { if (sidePanel.classList.contains('open') && panelSessions.style.display !== 'none') closePanel(); else openPanel('sessions'); };
    btnFiles.onclick = () => { if (sidePanel.classList.contains('open') && panelFiles.style.display !== 'none') closePanel(); else openPanel('files'); };
    panelOverlay.onclick = closePanel;
    panelTabs.forEach(t => t.onclick = () => switchTab(t.dataset.tab));

    // Session management
    function createSession(name) {
      const id = 'sess-' + Math.random().toString(36).slice(2, 8);
      const ws = new WebSocket(wsBase + '/ws');
      const term = new Terminal({
        cursorBlink: true,
        theme: {
          background: '#0d1117', foreground: '#e6edf3', cursor: '#58a6ff',
          selectionBackground: '#264f78',
          black: '#484f58', red: '#ff7b72', green: '#3fb950', yellow: '#d29922',
          blue: '#58a6ff', magenta: '#bc8cff', cyan: '#39d353', white: '#b1bac4',
          brightBlack: '#6e7681', brightRed: '#ffa198', brightGreen: '#56d364',
          brightYellow: '#e3b341', brightBlue: '#79c0ff', brightMagenta: '#d2a8ff',
          brightCyan: '#56d364', brightWhite: '#f0f6fc',
        },
        fontSize: 14,
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
        convertEol: true,
        allowProposedApi: true,
      });
      const fit = new FitAddon.FitAddon();
      term.loadAddon(fit);

      const wrap = document.createElement('div');
      wrap.className = 'terminal-wrap';
      wrap.id = 'tw-' + id;
      document.getElementById('termContainer').appendChild(wrap);
      term.open(wrap);

      ws.onopen = () => {
        term.write('\\r\\n\\x1b[38;5;39m[serfy]\\x1b[0m Session started\\r\\n\\r\\n');
        session.alive = true;
        renderSessions();
      };
      ws.onmessage = (e) => term.write(e.data);
      ws.onclose = () => {
        term.write('\\r\\n\\x1b[38;5;196m[serfy]\\x1b[0m Session ended\\r\\n');
        session.alive = false;
        renderSessions();
      };
      term.onData((data) => { if (ws.readyState === 1) ws.send(data); });

      const session = { id, name: name || 'Session ' + (sessions.length + 1), ws, term, fit, wrap, alive: false, created: new Date() };
      sessions.push(session);
      activateSession(session);
      renderSessions();
      return session;
    }

    function activateSession(session) {
      activeSession = session;
      sessions.forEach(s => {
        s.wrap.classList.toggle('active', s === session);
      });
      renderTabs();
      renderSessions();
      setTimeout(() => {
        session.fit.fit();
        session.term.focus();
      }, 50);
    }

    function closeSession(session) {
      try { session.ws.close(); } catch {}
      try { session.term.dispose(); } catch {}
      session.wrap.remove();
      const idx = sessions.indexOf(session);
      sessions.splice(idx, 1);
      if (activeSession === session) {
        if (sessions.length > 0) activateSession(sessions[Math.min(idx, sessions.length - 1)]);
        else activeSession = null;
      }
      renderSessions();
      renderTabs();
    }

    function renderSessions() {
      const list = document.getElementById('sessionList');
      list.innerHTML = '';
      sessions.forEach(s => {
        const li = document.createElement('li');
        li.className = 'session-item' + (s === activeSession ? ' active' : '');
        li.innerHTML =
          '<span class="session-dot ' + (s.alive ? '' : 'dead') + '"></span>' +
          '<div class="session-info">' +
            '<div class="session-name">' + esc(s.name) + '</div>' +
            '<div class="session-detail">' + (s.alive ? 'Running' : 'Closed') + ' &middot; ' + s.created.toLocaleTimeString() + '</div>' +
          '</div>' +
          '<div class="session-actions"><button title="Close"><i class="mdi mdi-close"></i></button></div>';
        li.querySelector('.session-info').onclick = () => { activateSession(s); closePanel(); };
        li.querySelector('.session-actions button').onclick = (e) => { e.stopPropagation(); closeSession(s); };
        list.appendChild(li);
      });
    }

    function renderTabs() {
      const tabs = document.getElementById('termTabs');
      tabs.innerHTML = '';
      sessions.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'term-tab' + (s === activeSession ? ' active' : '');
        btn.innerHTML = '<i class="mdi mdi-console" style="margin-right:4px;"></i>' + esc(s.name) +
          '<span class="close-tab"><i class="mdi mdi-close"></i></span>';
        btn.onclick = (e) => {
          if (e.target.closest('.close-tab')) { closeSession(s); return; }
          activateSession(s);
        };
        tabs.appendChild(btn);
      });
    }

    document.getElementById('btnNewSession').onclick = () => createSession();

    // File manager
    async function loadFiles(dir) {
      const url = '/api/files' + (dir ? '?path=' + encodeURIComponent(dir) : '');
      const res = await fetch(url).then(r => r.json());
      if (res.error) { alert(res.error); return; }
      currentFilePath = res.path;
      document.getElementById('filePath').textContent = res.path;
      const list = document.getElementById('fileList');
      list.innerHTML = '';
      res.items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'file-item';
        const iconClass = item.isDir ? 'mdi-folder' : getFileIcon(item.name);
        const iconColor = item.isDir ? 'folder' : 'file';
        li.innerHTML =
          '<i class="mdi ' + iconClass + ' icon ' + iconColor + '"></i>' +
          '<span class="name">' + esc(item.name) + '</span>' +
          '<span class="meta">' + (item.isDir ? '' : formatSize(item.size)) + '</span>' +
          '<div class="file-item-actions">' +
            '<button class="act-download" title="Download"><i class="mdi mdi-download"></i></button>' +
            '<button class="act-rename" title="Rename"><i class="mdi mdi-pencil-outline"></i></button>' +
            '<button class="act-delete danger" title="Delete"><i class="mdi mdi-delete-outline"></i></button>' +
          '</div>';
        li.querySelector('.name').onclick = () => {
          if (item.isDir) loadFiles(currentFilePath + '/' + item.name);
          else viewFile(currentFilePath + '/' + item.name, item.name);
        };
        li.querySelector('.icon').onclick = li.querySelector('.name').onclick;
        li.querySelector('.act-download').onclick = (e) => {
          e.stopPropagation();
          const a = document.createElement('a');
          a.href = '/api/download?path=' + encodeURIComponent(currentFilePath + '/' + item.name);
          a.download = item.isDir ? item.name + '.tar.gz' : item.name;
          document.body.appendChild(a); a.click(); a.remove();
        };
        li.querySelector('.act-rename').onclick = (e) => {
          e.stopPropagation();
          showPrompt('Rename', item.name, async (newName) => {
            if (!newName || newName === item.name) return;
            const r = await fetch('/api/rename', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ path: currentFilePath + '/' + item.name, newName }) }).then(r=>r.json());
            if (r.error) alert(r.error);
            loadFiles(currentFilePath);
          });
        };
        li.querySelector('.act-delete').onclick = (e) => {
          e.stopPropagation();
          if (confirm('Delete "' + item.name + '"?')) {
            fetch('/api/delete', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ path: currentFilePath + '/' + item.name }) }).then(r=>r.json()).then(r => {
              if (r.error) alert(r.error);
              loadFiles(currentFilePath);
            });
          }
        };
        list.appendChild(li);
      });
    }

    document.getElementById('btnFileUp').onclick = () => {
      if (currentFilePath && currentFilePath !== '/') {
        const parent = currentFilePath.replace(/\\/[^\\/]+\\/?$/, '') || '/';
        loadFiles(parent);
      }
    };
    document.getElementById('btnFileHome').onclick = () => loadFiles(null);
    document.getElementById('btnFileRefresh').onclick = () => loadFiles(currentFilePath);
    document.getElementById('btnNewFolder').onclick = () => {
      showPrompt('New Folder', '', async (name) => {
        if (!name) return;
        const r = await fetch('/api/mkdir', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ path: currentFilePath + '/' + name }) }).then(r=>r.json());
        if (r.error) alert(r.error);
        loadFiles(currentFilePath);
      });
    };
    document.getElementById('btnNewFile').onclick = () => {
      showPrompt('New File', '', async (name) => {
        if (!name) return;
        const r = await fetch('/api/writefile', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ path: currentFilePath + '/' + name, content: '' }) }).then(r=>r.json());
        if (r.error) alert(r.error);
        loadFiles(currentFilePath);
      });
    };

    // File viewer
    async function viewFile(fpath, name) {
      const res = await fetch('/api/readfile?path=' + encodeURIComponent(fpath)).then(r => r.json());
      if (res.error) { alert(res.error); return; }
      document.getElementById('fileModalTitle').textContent = name;
      document.getElementById('fileModalContent').textContent = res.content;
      document.getElementById('fileModal').classList.add('show');
      editingFilePath = fpath;
    }
    document.getElementById('fileModalClose').onclick = () => document.getElementById('fileModal').classList.remove('show');
    document.getElementById('fileModalDone').onclick = () => document.getElementById('fileModal').classList.remove('show');
    document.getElementById('fileModalEdit').onclick = () => {
      document.getElementById('fileModal').classList.remove('show');
      const content = document.getElementById('fileModalContent').textContent;
      document.getElementById('editModalTitle').textContent = editingFilePath.split('/').pop();
      document.getElementById('editArea').value = content;
      document.getElementById('editModal').classList.add('show');
    };
    document.getElementById('editModalClose').onclick = () => document.getElementById('editModal').classList.remove('show');
    document.getElementById('editModalCancel').onclick = () => document.getElementById('editModal').classList.remove('show');
    document.getElementById('editModalSave').onclick = async () => {
      const content = document.getElementById('editArea').value;
      const r = await fetch('/api/writefile', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ path: editingFilePath, content }) }).then(r=>r.json());
      if (r.error) { alert(r.error); return; }
      document.getElementById('editModal').classList.remove('show');
      loadFiles(currentFilePath);
    };

    // Prompt dialog
    let promptCb = null;
    function showPrompt(title, value, cb) {
      document.getElementById('promptTitle').textContent = title;
      document.getElementById('promptInput').value = value;
      document.getElementById('promptOverlay').classList.add('show');
      promptCb = cb;
      setTimeout(() => document.getElementById('promptInput').focus(), 100);
    }
    document.getElementById('promptCancel').onclick = () => { document.getElementById('promptOverlay').classList.remove('show'); promptCb = null; };
    document.getElementById('promptOk').onclick = () => {
      const val = document.getElementById('promptInput').value;
      document.getElementById('promptOverlay').classList.remove('show');
      if (promptCb) promptCb(val);
      promptCb = null;
    };
    document.getElementById('promptInput').onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('promptOk').click(); };

    // Helpers
    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function formatSize(b) {
      if (b < 1024) return b + ' B';
      if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
      return (b/1024/1024).toFixed(1) + ' MB';
    }
    function getFileIcon(name) {
      const ext = name.split('.').pop().toLowerCase();
      const map = {
        js:'mdi-language-javascript', ts:'mdi-language-typescript', json:'mdi-code-json',
        py:'mdi-language-python', md:'mdi-language-markdown', html:'mdi-language-html5',
        css:'mdi-language-css3', sh:'mdi-console', yml:'mdi-file-cog', yaml:'mdi-file-cog',
        png:'mdi-file-image', jpg:'mdi-file-image', jpeg:'mdi-file-image', gif:'mdi-file-image',
        svg:'mdi-file-image', zip:'mdi-folder-zip', gz:'mdi-folder-zip', tar:'mdi-folder-zip',
        txt:'mdi-file-document-outline', log:'mdi-file-document-outline',
      };
      return map[ext] || 'mdi-file-outline';
    }

    // Resize
    window.addEventListener('resize', () => {
      if (activeSession) activeSession.fit.fit();
    });

    // Init: create first session
    createSession('Main');
  })();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/files') {
    const dir = url.searchParams.get('path') || process.cwd();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getFileList(dir)));
    return;
  }

  if (url.pathname === '/api/readfile') {
    const fpath = url.searchParams.get('path');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readFileContent(fpath)));
    return;
  }

  if (url.pathname === '/api/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const data = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(deleteFileOrDir(data.path)));
    });
    return;
  }

  if (url.pathname === '/api/rename' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const data = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(renameItem(data.path, data.newName)));
    });
    return;
  }

  if (url.pathname === '/api/mkdir' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const data = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(createDir(data.path)));
    });
    return;
  }

  if (url.pathname === '/api/download') {
    const fpath = url.searchParams.get('path');
    try {
      const resolved = path.resolve(fpath);
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        const name = path.basename(resolved);
        res.writeHead(200, {
          'Content-Type': 'application/gzip',
          'Content-Disposition': 'attachment; filename="' + name + '.tar.gz"',
        });
        const tar = spawn('tar', ['czf', '-', '-C', path.dirname(resolved), name]);
        tar.stdout.pipe(res);
        tar.stderr.on('data', () => {});
        tar.on('close', () => res.end());
        tar.on('error', () => { res.statusCode = 500; res.end('tar failed'); });
      } else {
        const name = path.basename(resolved);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="' + name + '"',
          'Content-Length': stat.size,
        });
        fs.createReadStream(resolved).pipe(res);
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(err.message);
    }
    return;
  }

  if (url.pathname === '/api/writefile' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const data = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(writeFileContent(data.path, data.content)));
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(HTML);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  const shell = createShell();

  shell.stdout.on('data', (data) => {
    try { ws.send(data.toString()); } catch {}
  });
  shell.stderr.on('data', (data) => {
    try { ws.send(data.toString()); } catch {}
  });
  shell.on('close', () => {
    try { ws.close(); } catch {}
  });

  ws.on('message', (msg) => {
    try { shell.stdin.write(msg.toString()); } catch {}
  });

  ws.on('close', () => {
    try { shell.kill(); } catch {}
  });
});

server.listen(PORT, async () => {
  console.log(`[serfy] http://localhost:${PORT}`);

  try {
    let localtunnel;
    try {
      localtunnel = require('localtunnel');
    } catch {
      console.log('[serfy] Installing localtunnel...');
      execSync('npm install localtunnel', { cwd: __dirname, stdio: 'inherit' });
      localtunnel = require('localtunnel');
    }

    const tunnel = await localtunnel({ port: PORT });
    const password = await new Promise((resolve, reject) => {
      require('https').get('https://loca.lt/mytunnelpassword', (r) => {
        let d = ''; r.on('data', (c) => d += c); r.on('end', () => resolve(d.trim()));
      }).on('error', reject);
    });
    console.log(`[serfy] ${tunnel.url}`);
    console.log(`[serfy] password: ${password}`);
    tunnel.on('close', () => console.log('[serfy] tunnel closed'));
  } catch (err) {
    console.error('[serfy] Tunnel failed:', err.message);
    console.log('[serfy] Still running on http://localhost:' + PORT);
  }
});
