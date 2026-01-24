import { renderNav } from '../../components/nav.js';
import { renderAdminSidebar } from '../../components/sidebar.js';
import { icon } from '../../components/icon.js';
import { api } from '../../utils/api.js';
import { toast } from '../../components/toast.js';


export default function() {
  return `
    ${renderNav()}
    <div class="admin-layout">
      ${renderAdminSidebar('dashboard')}
      <main class="admin-content">
        <div class="admin-header">
          <h1>Admin Dashboard</h1>
          <p class="text-secondary">System overview and quick actions</p>
        </div>

        <div class="stats-grid" id="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">${icon('server', 24)}</div>
            <div class="stat-info">
              <span class="stat-value" id="stat-servers">—</span>
              <span class="stat-label">Total Servers</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">${icon('users', 24)}</div>
            <div class="stat-info">
              <span class="stat-value" id="stat-users">—</span>
              <span class="stat-label">Users</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">${icon('package', 24)}</div>
            <div class="stat-info">
              <span class="stat-value" id="stat-eggs">—</span>
              <span class="stat-label">Eggs</span>
            </div>
          </div>
        </div>

        <div class="admin-grid">
          <section class="admin-section">
            <div class="section-header">
              <h2>System Status</h2>
              <button class="btn btn-ghost" id="refresh-status">${icon('refresh', 16)}</button>
            </div>
            <div class="status-list" id="status-list">
              <div class="status-item">
                <span class="status-indicator status-online"></span>
                <span>Panel</span>
                <span class="text-secondary">Operational</span>
              </div>

              <div class="status-item" id="db-status">
                <span class="status-indicator status-online"></span>
                <span>Database</span>
                <span class="text-secondary">Connected</span>
              </div>
            </div>
          </section>



          <section class="admin-section">
            <div class="section-header">
              <h2>Recent Activity</h2>
            </div>
            <div class="activity-list" id="activity-list">
              <p class="text-secondary">No recent activity</p>
            </div>
          </section>

          <section class="admin-section">
            <div class="section-header">
              <h2>Quick Actions</h2>
            </div>
            <div class="quick-actions">
              <a href="/admin/servers/new" class="action-card">
                ${icon('plus', 20)}
                <span>New Server</span>
              </a>
              <a href="/admin/users/new" class="action-card">
                ${icon('user-plus', 20)}
                <span>New User</span>
              </a>

              <a href="/admin/eggs" class="action-card">
                ${icon('package', 20)}
                <span>Manage Eggs</span>
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  `;
}

export async function mount() {
  async function loadStats() {
    try {
      const res = await api.get('/admin/stats');
      const stats = res.data;

      document.getElementById('stat-servers').textContent = stats.servers || 0;
      document.getElementById('stat-users').textContent = stats.users || 0;
      document.getElementById('stat-eggs').textContent = stats.eggs || 0;
    } catch (err) {
      toast.error('Failed to load stats');
    }
  }

  document.getElementById('refresh-status')?.addEventListener('click', loadStats);

  await loadStats();
}
