// ============================
// DOC PAGES - add new pages here
// ============================
const DOCS = [{
    section: 'Getting Started',
    pages: [{
        id: 'installation',
        title: 'Installation',
        file: 'installation.md',
        desc: 'Setup guide for the panel'
      },
      {
        id: 'configuration',
        title: 'Configuration',
        file: 'configuration.md',
        desc: 'Panel and database config'
      },
      {
        id: 'daemon-setup',
        title: 'Daemon Setup',
        file: 'daemon-setup.md',
        desc: 'Setting up nodes with Sodium Reaction'
      },
    ]
  },
  {
    section: 'Reference',
    pages: [{
      id: 'architecture',
      title: 'Architecture',
      file: 'architecture.md',
      desc: 'System design overview'
    }, ]
  },
  {
    section: 'Plugins',
    pages: [{
        id: 'plugins-start',
        title: 'Getting Started',
        file: 'plugins/getting-started.md',
        desc: 'Create your first plugin'
      },
      {
        id: 'plugins-manifest',
        title: 'Manifest',
        file: 'plugins/manifest.md',
        desc: 'Plugin manifest format'
      },
      {
        id: 'plugins-hooks',
        title: 'Hooks',
        file: 'plugins/hooks.md',
        desc: 'Server-side hook system'
      },
      {
        id: 'plugins-routes',
        title: 'HTTP Routes',
        file: 'plugins/http-routes.md',
        desc: 'Custom API routes'
      },
      {
        id: 'plugins-ui',
        title: 'UI Components',
        file: 'plugins/ui-components.md',
        desc: 'Frontend slots and injection'
      },
      {
        id: 'plugins-db',
        title: 'Database',
        file: 'plugins/database.md',
        desc: 'Plugin data storage'
      },
      {
        id: 'plugins-settings',
        title: 'Settings',
        file: 'plugins/settings.md',
        desc: 'Plugin configuration UI'
      },
      {
        id: 'plugins-cron',
        title: 'Cron Jobs',
        file: 'plugins/cron-jobs.md',
        desc: 'Scheduled tasks'
      },
      {
        id: 'plugins-lifecycle',
        title: 'Lifecycle',
        file: 'plugins/lifecycle.md',
        desc: 'Plugin load/unload events'
      },
      {
        id: 'plugins-inter',
        title: 'Inter-Plugin',
        file: 'plugins/inter-plugin.md',
        desc: 'Cross-plugin communication'
      },
      {
        id: 'plugins-api',
        title: 'API Reference',
        file: 'plugins/api-reference.md',
        desc: 'Full plugin API'
      },
      {
        id: 'plugins-admin',
        title: 'Admin API',
        file: 'plugins/admin-api.md',
        desc: 'Admin management endpoints'
      },
    ]
  },
  {
    section: 'Plugin Examples',
    pages: [{
        id: 'ex-hello',
        title: 'Hello World',
        file: 'plugins/examples/hello-world.md',
        desc: 'Minimal plugin example'
      },
      {
        id: 'ex-discord',
        title: 'Discord Notifications',
        file: 'plugins/examples/discord-notifications.md',
        desc: 'Send events to Discord'
      },
      {
        id: 'ex-analytics',
        title: 'Analytics',
        file: 'plugins/examples/analytics.md',
        desc: 'Track panel usage'
      },
      {
        id: 'ex-guard',
        title: 'Server Guard',
        file: 'plugins/examples/server-guard.md',
        desc: 'Auto-restart crashed servers'
      },
    ]
  },
];

const ALL_PAGES = DOCS.flatMap(s => s.pages);
const PAGE_MAP = Object.fromEntries(ALL_PAGES.map(p => [p.id, p]));

let currentPage = null;
const cache = {};

const $nav = document.getElementById('nav');
const $page = document.getElementById('page');
const $search = document.getElementById('search');
const $topbar = document.getElementById('topbar');
const $sidebar = document.getElementById('sidebar');
const $overlay = document.getElementById('overlay');
const $menuBtn = document.getElementById('menu-btn');

function buildNav() {
  $nav.innerHTML = DOCS.map(section => `
        <div class="nav-group">
            <div class="nav-group-title">${section.section}</div>
            ${section.pages.map(p => `<a class="nav-item" data-id="${p.id}" href="?file=${p.file}">${p.title}</a>`).join('')}
        </div>
    `).join('');

  $nav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.id);
      closeMobile();
    });
  });
}

$search.addEventListener('input', () => {
  const q = $search.value.toLowerCase().trim();
  $nav.querySelectorAll('.nav-item').forEach(el => {
    const page = PAGE_MAP[el.dataset.id];
    if (!q) {
      el.classList.remove('hidden');
      return;
    }
    const match = page.title.toLowerCase().includes(q) || page.desc.toLowerCase().includes(q) || page.file.toLowerCase().includes(q);
    el.classList.toggle('hidden', !match);
  });
});

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    $search.focus();
  }
  if (e.key === 'Escape') {
    $search.blur();
    $search.value = '';
    $search.dispatchEvent(new Event('input'));
  }
});

async function navigate(id) {
  if (id) {
    const page = PAGE_MAP[id];
    history.pushState({
      id
    }, '', `?file=${page.file}`);
  } else {
    history.pushState({
      id: null
    }, '', 'viewer.html');
  }
  await render(id);
}

async function render(id) {
  currentPage = id;
  updateActiveNav();

  if (!id) {
    renderHome();
    document.title = 'Docs - Sodium';
    updateBreadcrumb(null);
    return;
  }

  const page = PAGE_MAP[id];
  if (!page) {
    $page.innerHTML = '<p class="error">Page not found.</p>';
    return;
  }

  $page.innerHTML = '<p class="loading">Loading...</p>';
  document.title = page.title + ' - Sodium Docs';
  updateBreadcrumb(page);

  try {
    if (!cache[page.file]) {
      const res = await fetch(page.file);
      if (!res.ok) throw new Error();
      cache[page.file] = await res.text();
    }
    $page.innerHTML = marked.parse(cache[page.file]);
    $page.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      const match = ALL_PAGES.find(p => href === p.file || href.endsWith(p.file));
      if (match) {
        a.addEventListener('click', e => {
          e.preventDefault();
          navigate(match.id);
        });
      }
    });
    window.scrollTo(0, 0);
  } catch {
    $page.innerHTML = '<p class="error">Could not load: ' + page.file + '</p>';
  }
}

function renderHome() {
  $page.innerHTML = `
        <h1>Sodium Documentation</h1>
        <p style="color:#a1a1aa;margin-bottom:8px;">Everything you need to set up, configure, and extend Sodium.</p>
        ${DOCS.map(section => `
            <h2 style="font-size:16px;margin:28px 0 12px;color:#71717a;font-weight:600">${section.section}</h2>
            <div class="home-grid">
                ${section.pages.map(p => `
                    <a class="home-card" href="?file=${p.file}" onclick="event.preventDefault();navigate('${p.id}')">
                        <h3>${p.title}</h3>
                        <p>${p.desc}</p>
                    </a>
                `).join('')}
            </div>
        `).join('')}
    `;
}

function updateActiveNav() {
  $nav.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === currentPage);
  });
}

function updateBreadcrumb(page) {
  const menuHtml = '<button class="menu-btn" id="menu-btn-inner" onclick="toggleMobile()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>';
  if (!page) {
    $topbar.innerHTML = menuHtml + '<span>Docs</span>';
  } else {
    const section = DOCS.find(s => s.pages.some(p => p.id === page.id));
    $topbar.innerHTML = menuHtml + `<a href="#" onclick="navigate(null);return false">Docs</a><span>/</span><span style="color:#71717a">${section?.section || ''}</span><span>/</span><span style="color:#d4d4d8">${page.title}</span>`;
  }
}

function toggleMobile() {
  $sidebar.classList.toggle('open');
  $overlay.classList.toggle('open');
}

function closeMobile() {
  $sidebar.classList.remove('open');
  $overlay.classList.remove('open');
}
$menuBtn.addEventListener('click', toggleMobile);
$overlay.addEventListener('click', closeMobile);

window.addEventListener('popstate', e => {
  if (e.state?.id !== undefined) {
    render(e.state.id);
  } else {
    initFromURL();
  }
});

function initFromURL() {
  const params = new URLSearchParams(location.search);
  const file = params.get('file');
  if (file) {
    const page = ALL_PAGES.find(p => p.file === file);
    if (page) {
      render(page.id);
      return;
    }
  }
  render(null);
}

buildNav();
initFromURL();
