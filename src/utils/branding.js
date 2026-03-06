let brandingCache = null;

const DEFAULTS = {
  name: 'Sodium',
  logo: null,
  favicon: null,
  accentColor: '#d97339',
  accentHover: '#e88a4d',
  accentMuted: 'rgba(217, 115, 57, 0.1)',
  ogTitle: '',
  ogDescription: '',
  ogImage: null
};

export async function loadBranding() {
  try {
    const cached = localStorage.getItem('branding');
    if (cached) {
      brandingCache = JSON.parse(cached);
      applyBranding(brandingCache);
    }

    const res = await fetch('/api/branding');
    if (res.ok) {
      brandingCache = await res.json();
      localStorage.setItem('branding', JSON.stringify(brandingCache));
      applyBranding(brandingCache);
    }
  } catch {
    if (!brandingCache) brandingCache = DEFAULTS;
  }
  return brandingCache;
}

export function getBranding() {
  if (brandingCache) return brandingCache;

  try {
    const cached = localStorage.getItem('branding');
    if (cached) {
      brandingCache = JSON.parse(cached);
      return brandingCache;
    }
  } catch {}

  return DEFAULTS;
}

function applyBranding(branding) {
  const isDefault = branding.accentColor === '#d97339' && !branding.accentHover && !branding.accentMuted;

  if (!isDefault && branding.accentColor) {
    document.documentElement.style.setProperty('--accent', branding.accentColor);
    document.documentElement.style.setProperty('--accent-hover', branding.accentHover || branding.accentColor);
    document.documentElement.style.setProperty('--accent-muted', branding.accentMuted || branding.accentColor + '1a');
  } else {
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-hover');
    document.documentElement.style.removeProperty('--accent-muted');
  }

  if (branding.favicon) {
    const link = document.querySelector('link[rel="icon"]');
    if (link) link.href = branding.favicon;
  }
}

export function clearBrandingCache() {
  brandingCache = null;
  localStorage.removeItem('branding');
}
