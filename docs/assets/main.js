const menuToggle = document.getElementById('menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
menuToggle.addEventListener('click', () => mobileNav.classList.toggle('open'));

function closeMobile() {
  mobileNav.classList.remove('open')
}

(function () {
  var canvas = document.createElement('canvas');
  canvas.id = 'anibg';
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
  document.body.prepend(canvas);

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w, h;
  var particles = [];
  var ACCENT = '#e07a3a';
  var PARTICLE_COUNT = 60;
  var LINE_DIST = 140;
  var raf;
  
  // Variable para rastrear la posición del scroll
  var lastScrollY = window.scrollY;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createParticle() {
    var brightness = rand(0.15, 0.5);
    var isAccent = Math.random() < 0.12;
    return {
      x: rand(0, w),
      y: rand(0, h),
      // Velocidad constante (sin fricción) para que sean independientes
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
      r: rand(1, 2.2),
      color: isAccent
        ? ACCENT
        : 'rgba(255,255,255,' + brightness + ')',
      alpha: isAccent ? 0.7 : brightness,
      baseAlpha: isAccent ? 0.7 : brightness,
      pulse: rand(0, Math.PI * 2),
      pulseSpeed: rand(0.005, 0.02),
    };
  }

  function init() {
    resize();
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Fondo degradado
    var grd = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.7);
    grd.addColorStop(0, 'rgba(224,122,58,0.03)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.pulse += p.pulseSpeed;
      p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(p.pulse));

      // Movimiento constante independiente
      p.x += p.vx;
      p.y += p.vy;

      // Margen de seguridad para que no se vean desaparecer de golpe
      var buffer = 50; 

      // Lógica de "wrap" (si salen de la pantalla, aparecen por el otro lado)
      if (p.x < -buffer) p.x = w + buffer;
      if (p.x > w + buffer) p.x = -buffer;
      if (p.y < -buffer) p.y = h + buffer;
      if (p.y > h + buffer) p.y = -buffer;

      // Dibujar partícula
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle =
        p.color === ACCENT
          ? 'rgba(224,122,58,' + p.alpha + ')'
          : 'rgba(255,255,255,' + p.alpha + ')';
      ctx.fill();

      // Dibujar líneas entre partículas cercanas
      for (var j = i + 1; j < particles.length; j++) {
        var p2 = particles[j];
        var lx = p.x - p2.x;
        var ly = p.y - p2.y;
        var ld = Math.sqrt(lx * lx + ly * ly);
        if (ld < LINE_DIST) {
          var alpha = (1 - ld / LINE_DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    raf = requestAnimationFrame(draw);
  }

  // Evento de Scroll para el efecto Parallax
  window.addEventListener('scroll', function () {
    var currentScrollY = window.scrollY;
    var deltaY = currentScrollY - lastScrollY;
    lastScrollY = currentScrollY;

    // Movemos las partículas en base a la dirección del scroll
    for (var i = 0; i < particles.length; i++) {
      // El factor 0.4 controla la intensidad del movimiento con el scroll.
      // Puedes aumentarlo (ej. 0.8) para que se muevan más rápido.
      particles[i].y -= deltaY * 0.4; 
    }
  });

  window.addEventListener('resize', function () {
    resize();
  });

  init();
  draw();
})();

(async function() {
  const container = document.getElementById('changelog-list');
  const REPO = 'sodiumpanel/panel';

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Helper para no repetir la lógica de formateo (negritas y código)
  function formatText(text) {
    return text
      .replace(/`([^`]+)`/g, '<code style="color:var(--accent);background:var(--surface-3);padding:1px 5px;border-radius:3px;">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#fff">$1</strong>');
  }

  function parseBody(body) {
    if (!body) return '<p style="color:var(--text-tertiary);font-size:12px;">No release notes.</p>';
    
    let html = '';
    let inList = false;
    
    for (const line of body.split('\n')) {
      const t = line.trim();
      
      if (!t) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        continue;
      }
      
      if (t.startsWith('## ') || t.startsWith('### ')) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<h4 style="font-size:13px;font-weight:600;color:#fff;margin:10px 0 4px">${t.replace(/^#{2,3}\s+/,'')}</h4>`;
      } else if (t.startsWith('- ') || t.startsWith('* ')) {
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        html += `<li>${formatText(t.replace(/^[-*]\s+/,''))}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        // AQUÍ ESTABA EL ERROR: Espacios en etiquetas HTML y en la sintaxis ${}
        html += `<p style="color:var(--text-secondary);font-size:12px;margin-bottom:4px;">${formatText(t)}</p>`;
      }
    }
    
    if (inList) html += '</ul>';
    return html;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases`);
    if (!res.ok) throw new Error();
    const releases = await res.json();
    
    if (!releases.length) {
      container.innerHTML = `<div class="changelog-card" style="text-align:center;color:var(--text-tertiary);padding:40px 20px">No releases found. <a href="https://github.com/${REPO}/releases" style="color:var(--accent)">Check GitHub</a>.</div>`;
      return;
    }
    
    container.innerHTML = releases.slice(0, 3).map((r, i) => `
<div class="changelog-card">
  <div class="changelog-header">
    <div>
      <span class="changelog-tag">${r.tag_name || r.name}</span>
      ${i === 0 ? '<span class="changelog-badge">Latest</span>' : ''}
    </div>
    <span class="changelog-date">${formatDate(r.published_at || r.created_at)}</span>
  </div>
  <div>${parseBody(r.body)}</div>
  <a class="more" href="${r.html_url}">View on GitHub →</a>
</div>`).join('');

  } catch {
    container.innerHTML = `
<div class="changelog-card">
  <div class="changelog-header">
    <div><span class="changelog-tag">v1.2.0</span><span class="changelog-badge">Latest</span></div>
  </div>
  <h4>Highlights</h4>
  <ul>
    <li>Circuit breaker for Panel API calls</li>
    <li>SQLite busy timeout to prevent lock errors</li>
    <li>Fixed credential file loading bug</li>
    <li>Multi-arch build & release workflows</li>
  </ul>
  <p style="color:var(--text-tertiary);font-size:11px;margin-top:10px;">Could not load changelog. <a href="https://github.com/${REPO}/releases" style="color:var(--accent)">View on GitHub →</a></p>
</div>`;
  }
})();
