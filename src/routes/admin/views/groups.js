import { escapeHtml } from '../../../utils/security.js';
import { icons, icon } from '../../../utils/icons.js';
import * as toast from '../../../utils/toast.js';
import * as modal from '../../../utils/modal.js';
import { api } from '../../../utils/api.js';
import { state } from '../state.js';
import { renderBreadcrumb, setupBreadcrumbListeners } from '../utils/ui.js';

const navigateTo = (...args) => window.adminNavigate(...args);

const PERMISSION_CATEGORIES = [
  {
    label: 'Admin Panel',
    permissions: [
      { id: 'admin.overview', label: 'View Overview' },
      { id: 'admin.nodes', label: 'Manage Nodes' },
      { id: 'admin.servers', label: 'Manage Servers' },
      { id: 'admin.users', label: 'Manage Users' },
      { id: 'admin.groups', label: 'Manage Groups' },
      { id: 'admin.nests', label: 'Manage Nests & Eggs' },
      { id: 'admin.locations', label: 'Manage Locations' },
      { id: 'admin.settings', label: 'Panel Settings' },
      { id: 'admin.announcements', label: 'Manage Announcements' },
      { id: 'admin.webhooks', label: 'Manage Webhooks' },
      { id: 'admin.plugins', label: 'Manage Plugins' },
      { id: 'admin.audit', label: 'View Audit Log' },
      { id: 'admin.activity', label: 'View Activity Log' },
      { id: 'admin.incidents', label: 'Manage Incidents' },
    ]
  },
  {
    label: 'Servers',
    permissions: [
      { id: 'server.create', label: 'Create Servers' },
      { id: 'server.delete', label: 'Delete Servers' },
      { id: 'server.update', label: 'Update Servers' },
      { id: 'server.console', label: 'Access Console' },
      { id: 'server.files', label: 'File Manager' },
      { id: 'server.backup', label: 'Manage Backups' },
    ]
  },
  {
    label: 'Schedules',
    permissions: [
      { id: 'schedule.create', label: 'Create Schedules' },
      { id: 'schedule.update', label: 'Update Schedules' },
      { id: 'schedule.delete', label: 'Delete Schedules' },
    ]
  },
  {
    label: 'Global',
    permissions: [
      { id: '*', label: 'All Permissions (Wildcard)' },
    ]
  }
];

export async function renderGroupsList(container, username, loadView) {
  try {
    const res = await api('/api/admin/groups');
    const data = await res.json();
    const groups = data.groups || [];
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Groups' }])}
        <div class="admin-header-actions">
          <button class="btn btn-primary" id="create-group-btn">
            ${icons.add}
            Create Group
          </button>
        </div>
      </div>
      
      <div class="admin-list">
        ${groups.length === 0 ? `
          <div class="empty-state">
            ${icons.group}
            <h3>No Groups</h3>
            <p>Create user groups to manage permissions and resource limits</p>
          </div>
        ` : `
          <div class="list-grid">
            ${groups.map(group => `
              <div class="list-card" data-id="${group.id}">
                <div class="list-card-header">
                  <div class="list-card-icon">
                    ${icons.group}
                  </div>
                  <div class="list-card-title">
                    <h3>${escapeHtml(group.name)}</h3>
                    <span class="list-card-subtitle">${escapeHtml(group.description || 'No description')}</span>
                  </div>
                </div>
                <div class="list-card-stats">
                  <div class="stat">
                    <span class="stat-label">Members</span>
                    <span class="stat-value">${(group.members || []).length}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Permissions</span>
                    <span class="stat-value">${(group.permissions || []).length}</span>
                  </div>
                </div>
                <div class="list-card-footer">
                  <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); adminNavigate('groups', '${group.id}')">
                    ${icons.settings}
                    Manage
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo);
    
    document.getElementById('create-group-btn').onclick = () => showCreateGroupModal(loadView);
    
    document.querySelectorAll('.list-card[data-id]').forEach(card => {
      card.onclick = () => navigateTo('groups', card.dataset.id);
    });
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load groups</div>`;
  }
}

function showCreateGroupModal(loadView) {
  const existing = document.getElementById('create-group-modal');
  if (existing) existing.remove();
  
  const m = document.createElement('div');
  m.id = 'create-group-modal';
  m.className = 'modal';
  m.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Create Group</h3>
        <button class="modal-close" id="close-group-modal">
          ${icons.close}
        </button>
      </div>
      <form id="create-group-form" class="modal-body">
        <div class="form-group">
          <label>Name *</label>
          <input type="text" name="name" required placeholder="e.g. Moderators" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" name="description" placeholder="Group description" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancel-group-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Group</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(m);
  requestAnimationFrame(() => m.classList.add('active'));
  
  const closeModal = () => {
    m.classList.remove('active');
    setTimeout(() => m.remove(), 150);
  };
  
  document.getElementById('close-group-modal').onclick = closeModal;
  document.getElementById('cancel-group-modal').onclick = closeModal;
  m.querySelector('.modal-backdrop').onclick = closeModal;
  
  document.getElementById('create-group-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '${icons.sync}';
    
    try {
      const res = await api('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: {
            name: form.name.value,
            description: form.description.value || undefined
          }
        })
      });
      const data = await res.json();
      
      if (data.success || data.group) {
        toast.success('Group created');
        closeModal();
        loadView();
      } else {
        toast.error(data.error || 'Failed to create group');
        btn.disabled = false;
        btn.textContent = 'Create Group';
      }
    } catch (err) {
      toast.error('Failed to create group');
      btn.disabled = false;
      btn.textContent = 'Create Group';
    }
  };
}

export async function renderGroupDetail(container, username, groupId) {
  try {
    const [groupsRes, usersRes] = await Promise.all([
      api('/api/admin/groups'),
      api('/api/admin/users?per_page=1000')
    ]);
    const groupsData = await groupsRes.json();
    const usersData = await usersRes.json();
    const groups = groupsData.groups || [];
    const users = usersData.users || [];
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
      container.innerHTML = `<div class="error">Group not found</div>`;
      return;
    }
    
    const memberUsers = users.filter(u => (group.members || []).includes(u.id));
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([
          { label: 'Groups', onClick: 'list-groups' },
          { label: group.name }
        ])}
        <div class="admin-header-actions">
          <button class="btn btn-danger" id="delete-group-btn">
            ${icons.delete}
            Delete
          </button>
        </div>
      </div>
      
      <div class="detail-tabs">
        <button class="detail-tab ${state.currentView.subTab === 'settings' ? 'active' : ''}" data-subtab="settings">Settings</button>
        <button class="detail-tab ${state.currentView.subTab === 'members' ? 'active' : ''}" data-subtab="members">Members (${memberUsers.length})</button>
      </div>
      
      <div class="detail-content" id="group-detail-content"></div>
    `;
    
    setupBreadcrumbListeners(navigateTo);
    
    document.querySelectorAll('.detail-tab').forEach(tab => {
      tab.onclick = () => {
        state.currentView.subTab = tab.dataset.subtab;
        document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderGroupSubTab(group, users, memberUsers);
      };
    });
    
    document.getElementById('delete-group-btn').onclick = async () => {
      const confirmed = await modal.confirm({ title: 'Delete Group', message: `Are you sure you want to delete "${group.name}"? This cannot be undone.`, danger: true });
      if (!confirmed) return;
      try {
        await api(`/api/admin/groups/${groupId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        toast.success('Group deleted');
        navigateTo('groups');
      } catch (e) {
        toast.error('Failed to delete group');
      }
    };
    
    renderGroupSubTab(group, users, memberUsers);
    
  } catch (e) {
    container.innerHTML = `<div class="error">Failed to load group</div>`;
  }
}

function renderGroupSubTab(group, users, memberUsers) {
  const content = document.getElementById('group-detail-content');
  
  switch (state.currentView.subTab) {
    case 'settings':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <h3>Group Settings</h3>
          <form id="group-settings-form" class="settings-form">
            <div class="form-section">
              <h4>General</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Name</label>
                  <input type="text" name="name" value="${escapeHtml(group.name)}" required />
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <input type="text" name="description" value="${escapeHtml(group.description || '')}" />
                </div>
              </div>
            </div>
            
            ${PERMISSION_CATEGORIES.map(cat => `
              <div class="form-section">
                <h4>${cat.label}</h4>
                <div class="form-toggles">
                  ${cat.permissions.map(perm => `
                    <label class="toggle-item">
                      <input type="checkbox" name="perm" value="${perm.id}" ${(group.permissions || []).includes(perm.id) ? 'checked' : ''} />
                      <span class="toggle-content">
                        <span class="toggle-title">${perm.label}</span>
                        <span class="toggle-desc">${perm.id}</span>
                      </span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `).join('')}
            
            <div class="form-section">
              <h4>Resource Limits</h4>
              <p class="form-hint">Leave empty or 0 to use user defaults.</p>
              <div class="form-grid">
                <div class="form-group">
                  <label>Max Servers</label>
                  <input type="number" name="limit_servers" value="${group.limits?.servers ?? ''}" min="0" />
                </div>
                <div class="form-group">
                  <label>Max Memory (MB)</label>
                  <input type="number" name="limit_memory" value="${group.limits?.memory ?? ''}" min="0" />
                </div>
                <div class="form-group">
                  <label>Max Disk (MB)</label>
                  <input type="number" name="limit_disk" value="${group.limits?.disk ?? ''}" min="0" />
                </div>
                <div class="form-group">
                  <label>Max CPU (%)</label>
                  <input type="number" name="limit_cpu" value="${group.limits?.cpu ?? ''}" min="0" />
                </div>
                <div class="form-group">
                  <label>Max Backups</label>
                  <input type="number" name="limit_backups" value="${group.limits?.backups ?? ''}" min="0" />
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      `;
      
      document.getElementById('group-settings-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        
        const permissions = Array.from(
          e.target.querySelectorAll('input[name="perm"]:checked')
        ).map(cb => cb.value);
        
        const groupData = {
          name: form.get('name'),
          description: form.get('description'),
          permissions,
          limits: {
            servers: parseInt(form.get('limit_servers')) || null,
            memory: parseInt(form.get('limit_memory')) || null,
            disk: parseInt(form.get('limit_disk')) || null,
            cpu: parseInt(form.get('limit_cpu')) || null,
            backups: parseInt(form.get('limit_backups')) || null
          }
        };
        
        try {
          await api(`/api/admin/groups/${group.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group: groupData })
          });
          toast.success('Group updated successfully');
          navigateTo('groups', group.id, 'settings');
        } catch (e) {
          toast.error('Failed to update group');
        }
      };
      break;
      
    case 'members':
      content.innerHTML = `
        <div class="detail-card detail-card-wide">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Members</h3>
            <button class="btn btn-primary btn-sm" id="add-member-btn">
              ${icons.person_add}
              Add Member
            </button>
          </div>
          ${memberUsers.length === 0 ? `
            <div class="empty-state small">
              ${icons.people}
              <p>No members in this group</p>
            </div>
          ` : `
            <div class="user-servers-list" style="margin-top: 1rem;">
              ${memberUsers.map(u => `
                <div class="user-server-item">
                  <div class="user-server-info">
                    <div class="user-avatar">${(u.username || 'U')[0].toUpperCase()}</div>
                    <div class="user-server-details">
                      <span class="user-server-name">${escapeHtml(u.displayName || u.username)}</span>
                      <span class="user-server-meta">@${escapeHtml(u.username)}${u.email ? ' • ' + escapeHtml(u.email) : ''}</span>
                    </div>
                  </div>
                  <div class="user-server-actions">
                    <button class="btn btn-sm btn-danger-ghost remove-member-btn" data-user-id="${u.id}">
                      ${icons.close}
                      Remove
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
      
      document.getElementById('add-member-btn').onclick = async () => {
        const nonMembers = users.filter(u => !(group.members || []).includes(u.id));
        if (nonMembers.length === 0) {
          toast.info('All users are already members');
          return;
        }
        const username = await modal.prompt('Enter username to add:', { title: 'Add Member' });
        if (!username) return;
        const user = nonMembers.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) {
          toast.error('User not found or already a member');
          return;
        }
        try {
          await api(`/api/admin/groups/${group.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id })
          });
          toast.success(`Added ${user.username}`);
          navigateTo('groups', group.id, 'members');
        } catch {
          toast.error('Failed to add member');
        }
      };
      
      document.querySelectorAll('.remove-member-btn').forEach(btn => {
        btn.onclick = async () => {
          const confirmed = await modal.confirm({ title: 'Remove Member', message: 'Remove this user from the group?', danger: true });
          if (!confirmed) return;
          try {
            await api(`/api/admin/groups/${group.id}/members/${btn.dataset.userId}`, { method: 'DELETE' });
            toast.success('Member removed');
            navigateTo('groups', group.id, 'members');
          } catch {
            toast.error('Failed to remove member');
          }
        };
      });
      break;
  }
}
