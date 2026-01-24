export default function render(params) {
  const user = JSON.parse(localStorage.getItem('sodium_user') || '{}');
  
  return `
    <div class="page profile-page">
      <h1>Profile</h1>
      <div class="profile-card">
        <div class="profile-info">
          <p><strong>Username:</strong> ${user.username || 'N/A'}</p>
          <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
          <p><strong>Role:</strong> ${user.role || 'user'}</p>
        </div>
      </div>
    </div>
  `;
}
