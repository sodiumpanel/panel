import { escapeHtml, escapeUrl } from '../utils/security.js';

export function renderUser(targetUsername) {
  const app = document.getElementById('app');
  app.className = 'user-page';
  
  app.innerHTML = `
    <div class="user-container">
      <div class="loading-state">
        <span class="material-icons-outlined spinning">sync</span>
        <span>Loading profile...</span>
      </div>
    </div>
  `;
  
  loadUserProfile(targetUsername);
}

async function loadUserProfile(targetUsername) {
  const container = document.querySelector('.user-container');
  const viewer = localStorage.getItem('username') || '';
  
  try {
    const res = await fetch(`/api/user/profile?username=${encodeURIComponent(targetUsername)}&viewer=${encodeURIComponent(viewer)}`);
    const data = await res.json();
    
    if (data.error) {
      container.innerHTML = `
        <div class="error-state">
          <span class="material-icons-outlined">error</span>
          <p>User not found</p>
          <a href="/dashboard" class="btn btn-primary">Back to Dashboard</a>
        </div>
      `;
      return;
    }
    
    const user = data.user;
    const isPrivate = user.isPrivate;
    
    const avatarHtml = user.avatar ? 
      `<img src="${escapeUrl(user.avatar)}" alt="Avatar" onerror="this.src='/default-avatar.png'">` :
      `<img src="/default-avatar.png" alt="Avatar">`;
    
    container.innerHTML = `
      <div class="user-profile-card">
        <div class="user-header">
          <div class="user-avatar">
            ${avatarHtml}
          </div>
          <div class="user-info">
            <h1>${escapeHtml(user.displayName || user.username)}</h1>
            <span class="user-username">@${escapeHtml(user.username)}</span>
            ${isPrivate ? '<span class="private-badge"><span class="material-icons-outlined">lock</span> Private Profile</span>' : ''}
          </div>
        </div>
        
        ${!isPrivate && user.bio ? `
          <div class="user-bio">
            <h3>About</h3>
            <p>${escapeHtml(user.bio)}</p>
          </div>
        ` : ''}
        
        ${isPrivate ? `
          <div class="private-notice">
            <span class="material-icons-outlined">visibility_off</span>
            <p>This profile is private</p>
          </div>
        ` : ''}
        
        ${!isPrivate && user.createdAt ? `
          <div class="user-meta">
            <span class="material-icons-outlined">calendar_today</span>
            <span>Joined ${new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        ` : ''}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        <span class="material-icons-outlined">wifi_off</span>
        <p>Connection error. Please try again.</p>
        <a href="/dashboard" class="btn btn-primary">Back to Dashboard</a>
      </div>
    `;
  }
}
