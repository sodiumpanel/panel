import { escapeHtml } from '../../../utils/security.js';
import * as toast from '../../../utils/toast.js';
import * as modal from '../../../utils/modal.js';
import { api } from '../../../utils/api.js';
import { renderBreadcrumb, setupBreadcrumbListeners, renderPagination } from '../utils/ui.js';

const navigateTo = (...args) => window.adminNavigate(...args);

let ticketConfig = null;

export async function renderTicketsList(container, username, loadView) {
  const urlParams = new URLSearchParams(window.location.search);
  const page = parseInt(urlParams.get('page')) || 1;
  const status = urlParams.get('status') || '';
  const category = urlParams.get('category') || '';
  const priority = urlParams.get('priority') || '';
  
  try {
    const [ticketsRes, statsRes, configRes] = await Promise.all([
      api(`/api/tickets/admin/all?page=${page}&per_page=20${status ? `&status=${status}` : ''}${category ? `&category=${category}` : ''}${priority ? `&priority=${priority}` : ''}`),
      api('/api/tickets/admin/stats'),
      api('/api/tickets/config')
    ]);
    
    const { tickets, meta } = await ticketsRes.json();
    const stats = await statsRes.json();
    ticketConfig = await configRes.json();
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([{ label: 'Tickets' }])}
      </div>
      
      <div class="stats-grid stats-grid-compact">
        <div class="stat-card stat-small">
          <span class="stat-value">${stats.open || 0}</span>
          <span class="stat-label">Open</span>
        </div>
        <div class="stat-card stat-small">
          <span class="stat-value">${stats.answered || 0}</span>
          <span class="stat-label">Answered</span>
        </div>
        <div class="stat-card stat-small">
          <span class="stat-value">${stats.closed || 0}</span>
          <span class="stat-label">Closed</span>
        </div>
        <div class="stat-card stat-small">
          <span class="stat-value">${stats.total || 0}</span>
          <span class="stat-label">Total</span>
        </div>
      </div>
      
      <div class="list-controls">
        <div class="filter-group">
          <select id="status-filter" class="form-select">
            <option value="">All Status</option>
            <option value="open" ${status === 'open' ? 'selected' : ''}>Open</option>
            <option value="answered" ${status === 'answered' ? 'selected' : ''}>Answered</option>
            <option value="closed" ${status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
          <select id="category-filter" class="form-select">
            <option value="">All Categories</option>
            ${ticketConfig.categories.map(c => `
              <option value="${c}" ${category === c ? 'selected' : ''}>${c}</option>
            `).join('')}
          </select>
          <select id="priority-filter" class="form-select">
            <option value="">All Priorities</option>
            ${ticketConfig.priorities.map(p => `
              <option value="${p}" ${priority === p ? 'selected' : ''}>${p}</option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>User</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tickets.length === 0 ? `
              <tr><td colspan="8" class="empty-cell">No tickets found</td></tr>
            ` : tickets.map(ticket => `
              <tr class="ticket-row ${ticket.status === 'open' && ticket.priority === 'Urgent' ? 'row-urgent' : ''}">
                <td><span class="ticket-number">#${ticket.ticketNumber}</span></td>
                <td>
                  <a href="#" class="ticket-subject-link" data-id="${ticket.id}">
                    ${escapeHtml(ticket.subject)}
                  </a>
                </td>
                <td>
                  <div class="user-cell">
                    <span class="username">${escapeHtml(ticket.user?.username || 'Unknown')}</span>
                    <span class="email">${escapeHtml(ticket.user?.email || '')}</span>
                  </div>
                </td>
                <td><span class="badge badge-secondary">${escapeHtml(ticket.category)}</span></td>
                <td><span class="badge badge-${getPriorityColor(ticket.priority)}">${ticket.priority}</span></td>
                <td><span class="badge badge-${getStatusColor(ticket.status)}">${ticket.status}</span></td>
                <td>${formatTimeAgo(ticket.updatedAt)}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn btn-sm btn-primary view-ticket-btn" data-id="${ticket.id}">
                      <span class="material-icons-outlined">visibility</span>
                    </button>
                    <button class="btn btn-sm btn-danger delete-ticket-btn" data-id="${ticket.id}">
                      <span class="material-icons-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      ${renderPagination(meta, (p) => {
        const params = new URLSearchParams();
        params.set('page', p);
        if (status) params.set('status', status);
        if (category) params.set('category', category);
        if (priority) params.set('priority', priority);
        history.replaceState(null, '', `/admin/tickets?${params.toString()}`);
        loadView();
      })}
    `;
    
    setupBreadcrumbListeners(navigateTo);
    setupFilters(loadView, status, category, priority);
    setupTicketActions(container, loadView);
    
  } catch (e) {
    container.innerHTML = '<div class="error">Failed to load tickets</div>';
  }
}

function setupFilters(loadView, currentStatus, currentCategory, currentPriority) {
  const updateUrl = () => {
    const params = new URLSearchParams();
    const status = document.getElementById('status-filter').value;
    const category = document.getElementById('category-filter').value;
    const priority = document.getElementById('priority-filter').value;
    
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (priority) params.set('priority', priority);
    
    history.replaceState(null, '', `/admin/tickets${params.toString() ? '?' + params.toString() : ''}`);
    loadView();
  };
  
  document.getElementById('status-filter').onchange = updateUrl;
  document.getElementById('category-filter').onchange = updateUrl;
  document.getElementById('priority-filter').onchange = updateUrl;
}

function setupTicketActions(container, loadView) {
  container.querySelectorAll('.view-ticket-btn, .ticket-subject-link').forEach(el => {
    el.onclick = (e) => {
      e.preventDefault();
      const id = el.dataset.id;
      showTicketDetail(id, loadView);
    };
  });
  
  container.querySelectorAll('.delete-ticket-btn').forEach(btn => {
    btn.onclick = async () => {
      const confirmed = await modal.confirm({
        title: 'Delete Ticket',
        message: 'Are you sure you want to delete this ticket? This cannot be undone.',
        danger: true
      });
      if (!confirmed) return;
      
      try {
        const res = await api(`/api/tickets/admin/${btn.dataset.id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Ticket deleted');
          loadView();
        } else {
          toast.error('Failed to delete ticket');
        }
      } catch (e) {
        toast.error('Failed to delete ticket');
      }
    };
  });
}

async function showTicketDetail(ticketId, loadView) {
  try {
    const res = await api(`/api/tickets/${ticketId}`);
    const { ticket, messages } = await res.json();
    
    const html = `
      <div class="ticket-detail-modal">
        <div class="ticket-header-info">
          <div class="ticket-meta">
            <span class="badge badge-${getStatusColor(ticket.status)}">${ticket.status}</span>
            <span class="badge badge-${getPriorityColor(ticket.priority)}">${ticket.priority}</span>
            <span class="badge badge-secondary">${ticket.category}</span>
          </div>
          <div class="ticket-controls">
            <select id="ticket-status-select" class="form-select form-select-sm">
              <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
              <option value="answered" ${ticket.status === 'answered' ? 'selected' : ''}>Answered</option>
              <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
            </select>
            <select id="ticket-priority-select" class="form-select form-select-sm">
              ${ticketConfig.priorities.map(p => `
                <option value="${p}" ${ticket.priority === p ? 'selected' : ''}>${p}</option>
              `).join('')}
            </select>
          </div>
        </div>
        
        <div class="ticket-messages">
          ${messages.map(msg => `
            <div class="ticket-message ${msg.isStaff ? 'staff-message' : 'user-message'}">
              <div class="message-header">
                <span class="message-author">
                  ${escapeHtml(msg.user?.displayName || msg.user?.username || 'Unknown')}
                  ${msg.isStaff ? '<span class="staff-badge">Staff</span>' : ''}
                </span>
                <span class="message-time">${formatTimeAgo(msg.createdAt)}</span>
              </div>
              <div class="message-body">${escapeHtml(msg.message)}</div>
            </div>
          `).join('')}
        </div>
        
        ${ticket.status !== 'closed' ? `
          <div class="ticket-reply-form">
            <textarea id="reply-message" placeholder="Type your reply..." rows="3"></textarea>
          </div>
        ` : ''}
      </div>
    `;
    
    const result = await modal.custom({
      title: `#${ticket.ticketNumber}: ${escapeHtml(ticket.subject)}`,
      html,
      confirmText: ticket.status !== 'closed' ? 'Send Reply' : 'Close',
      cancelText: 'Back',
      width: '700px'
    });
    
    const newStatus = document.getElementById('ticket-status-select')?.value;
    const newPriority = document.getElementById('ticket-priority-select')?.value;
    const replyMessage = document.getElementById('reply-message')?.value?.trim();
    
    if (newStatus !== ticket.status || newPriority !== ticket.priority) {
      await api(`/api/tickets/admin/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, priority: newPriority })
      });
    }
    
    if (result && replyMessage && ticket.status !== 'closed') {
      await api(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage })
      });
      toast.success('Reply sent');
    }
    
    loadView();
    
  } catch (e) {
    toast.error('Failed to load ticket');
  }
}

export async function renderTicketDetail(container, username, ticketId) {
  try {
    const res = await api(`/api/tickets/${ticketId}`);
    const { ticket, messages } = await res.json();
    
    const configRes = await api('/api/tickets/config');
    ticketConfig = await configRes.json();
    
    container.innerHTML = `
      <div class="admin-header">
        ${renderBreadcrumb([
          { label: 'Tickets', onClick: () => navigateTo('tickets') },
          { label: `#${ticket.ticketNumber}` }
        ])}
      </div>
      
      <div class="ticket-detail-page">
        <div class="ticket-main">
          <div class="detail-card">
            <div class="ticket-detail-header">
              <h2>${escapeHtml(ticket.subject)}</h2>
              <div class="ticket-badges">
                <span class="badge badge-${getStatusColor(ticket.status)}">${ticket.status}</span>
                <span class="badge badge-${getPriorityColor(ticket.priority)}">${ticket.priority}</span>
                <span class="badge badge-secondary">${ticket.category}</span>
              </div>
            </div>
            
            <div class="ticket-messages-list">
              ${messages.map(msg => `
                <div class="ticket-message ${msg.isStaff ? 'staff-message' : 'user-message'}">
                  <div class="message-header">
                    <span class="message-author">
                      ${escapeHtml(msg.user?.displayName || msg.user?.username || 'Unknown')}
                      ${msg.isStaff ? '<span class="staff-badge">Staff</span>' : ''}
                    </span>
                    <span class="message-time">${formatTimeAgo(msg.createdAt)}</span>
                  </div>
                  <div class="message-body">${escapeHtml(msg.message).replace(/\n/g, '<br>')}</div>
                </div>
              `).join('')}
            </div>
            
            ${ticket.status !== 'closed' ? `
              <form id="reply-form" class="ticket-reply-form">
                <textarea name="message" placeholder="Type your reply..." rows="4" required></textarea>
                <button type="submit" class="btn btn-primary">
                  <span class="material-icons-outlined">send</span>
                  Send Reply
                </button>
              </form>
            ` : `
              <div class="ticket-closed-notice">
                <span class="material-icons-outlined">lock</span>
                This ticket is closed
                <button class="btn btn-sm btn-secondary" id="reopen-ticket-btn">Reopen</button>
              </div>
            `}
          </div>
        </div>
        
        <aside class="ticket-sidebar">
          <div class="detail-card">
            <h3>Ticket Info</h3>
            <div class="info-list">
              <div class="info-item">
                <span class="info-label">Created</span>
                <span class="info-value">${formatDate(ticket.createdAt)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Updated</span>
                <span class="info-value">${formatTimeAgo(ticket.updatedAt)}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-card">
            <h3>Actions</h3>
            <div class="form-group">
              <label>Status</label>
              <select id="update-status" class="form-select">
                <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
                <option value="answered" ${ticket.status === 'answered' ? 'selected' : ''}>Answered</option>
                <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select id="update-priority" class="form-select">
                ${ticketConfig.priorities.map(p => `
                  <option value="${p}" ${ticket.priority === p ? 'selected' : ''}>${p}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Category</label>
              <select id="update-category" class="form-select">
                ${ticketConfig.categories.map(c => `
                  <option value="${c}" ${ticket.category === c ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>
            <button class="btn btn-primary btn-block" id="update-ticket-btn">Update Ticket</button>
            <button class="btn btn-danger btn-block" id="delete-ticket-btn" style="margin-top: 0.5rem;">Delete Ticket</button>
          </div>
        </aside>
      </div>
    `;
    
    setupBreadcrumbListeners(navigateTo);
    
    const replyForm = document.getElementById('reply-form');
    if (replyForm) {
      replyForm.onsubmit = async (e) => {
        e.preventDefault();
        const message = replyForm.message.value.trim();
        if (!message) return;
        
        try {
          const res = await api(`/api/tickets/${ticketId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
          });
          
          if (res.ok) {
            toast.success('Reply sent');
            renderTicketDetail(container, username, ticketId);
          } else {
            toast.error('Failed to send reply');
          }
        } catch (e) {
          toast.error('Failed to send reply');
        }
      };
    }
    
    document.getElementById('update-ticket-btn').onclick = async () => {
      const status = document.getElementById('update-status').value;
      const priority = document.getElementById('update-priority').value;
      const category = document.getElementById('update-category').value;
      
      try {
        const res = await api(`/api/tickets/admin/${ticketId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, priority, category })
        });
        
        if (res.ok) {
          toast.success('Ticket updated');
          renderTicketDetail(container, username, ticketId);
        } else {
          toast.error('Failed to update ticket');
        }
      } catch (e) {
        toast.error('Failed to update ticket');
      }
    };
    
    document.getElementById('delete-ticket-btn').onclick = async () => {
      const confirmed = await modal.confirm({
        title: 'Delete Ticket',
        message: 'Are you sure? This cannot be undone.',
        danger: true
      });
      if (!confirmed) return;
      
      try {
        const res = await api(`/api/tickets/admin/${ticketId}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Ticket deleted');
          navigateTo('tickets');
        } else {
          toast.error('Failed to delete ticket');
        }
      } catch (e) {
        toast.error('Failed to delete ticket');
      }
    };
    
    const reopenBtn = document.getElementById('reopen-ticket-btn');
    if (reopenBtn) {
      reopenBtn.onclick = async () => {
        try {
          const res = await api(`/api/tickets/${ticketId}/reopen`, { method: 'POST' });
          if (res.ok) {
            toast.success('Ticket reopened');
            renderTicketDetail(container, username, ticketId);
          } else {
            toast.error('Failed to reopen ticket');
          }
        } catch (e) {
          toast.error('Failed to reopen ticket');
        }
      };
    }
    
  } catch (e) {
    container.innerHTML = '<div class="error">Failed to load ticket</div>';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'open': return 'warning';
    case 'answered': return 'info';
    case 'closed': return 'secondary';
    default: return 'secondary';
  }
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'Urgent': return 'danger';
    case 'High': return 'warning';
    case 'Medium': return 'info';
    case 'Low': return 'secondary';
    default: return 'secondary';
  }
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}
