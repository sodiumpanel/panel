import { api, getUser } from '../utils/api.js';
import { escapeHtml } from '../utils/security.js';
import * as toast from '../utils/toast.js';
import * as modal from '../utils/modal.js';

let ticketConfig = null;

export async function renderTickets(params = {}) {
  const app = document.getElementById('app');
  const user = getUser();
  
  if (!user) {
    window.location.href = '/auth';
    return;
  }
  
  app.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const configRes = await api('/api/tickets/config');
    ticketConfig = await configRes.json();
    
    if (!ticketConfig.enabled) {
      app.innerHTML = `
        <div class="page-container">
          <div class="empty-state">
            <span class="material-icons-outlined">support_agent_off</span>
            <h2>Support Not Available</h2>
            <p>The ticket system is currently disabled.</p>
            <a href="/dashboard" class="btn btn-primary">Back to Dashboard</a>
          </div>
        </div>
      `;
      return;
    }
    
    if (params.id) {
      await renderTicketDetail(params.id);
    } else {
      await renderTicketList();
    }
    
  } catch (e) {
    app.innerHTML = `<div class="error">Failed to load tickets</div>`;
  }
}

async function renderTicketList() {
  const app = document.getElementById('app');
  
  try {
    const res = await api('/api/tickets');
    const { tickets } = await res.json();
    
    app.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1>Support Tickets</h1>
            <p>Get help from our support team</p>
          </div>
          <button class="btn btn-primary" id="create-ticket-btn">
            <span class="material-icons-outlined">add</span>
            New Ticket
          </button>
        </div>
        
        <div class="tickets-list">
          ${tickets.length === 0 ? `
            <div class="empty-state">
              <span class="material-icons-outlined">confirmation_number</span>
              <h3>No Tickets</h3>
              <p>You haven't created any support tickets yet.</p>
            </div>
          ` : tickets.map(ticket => `
            <a href="/tickets/${ticket.id}" class="ticket-item" data-link>
              <div class="ticket-main-info">
                <span class="ticket-number">#${ticket.ticketNumber}</span>
                <span class="ticket-subject">${escapeHtml(ticket.subject)}</span>
              </div>
              <div class="ticket-meta">
                <span class="badge badge-${getStatusColor(ticket.status)}">${ticket.status}</span>
                <span class="badge badge-${getPriorityColor(ticket.priority)}">${ticket.priority}</span>
                <span class="badge badge-secondary">${ticket.category}</span>
                <span class="ticket-time">${formatTimeAgo(ticket.updatedAt)}</span>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `;
    
    document.getElementById('create-ticket-btn').onclick = () => showCreateTicketModal();
    
  } catch (e) {
    app.innerHTML = `<div class="error">Failed to load tickets</div>`;
  }
}

async function renderTicketDetail(ticketId) {
  const app = document.getElementById('app');
  
  try {
    const res = await api(`/api/tickets/${ticketId}`);
    
    if (!res.ok) {
      app.innerHTML = `
        <div class="page-container">
          <div class="error-state">
            <h2>Ticket Not Found</h2>
            <a href="/tickets" class="btn btn-primary">Back to Tickets</a>
          </div>
        </div>
      `;
      return;
    }
    
    const { ticket, messages } = await res.json();
    
    app.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div>
            <a href="/tickets" class="back-link" data-link>
              <span class="material-icons-outlined">arrow_back</span>
              Back to Tickets
            </a>
            <h1>#${ticket.ticketNumber}: ${escapeHtml(ticket.subject)}</h1>
            <div class="ticket-badges">
              <span class="badge badge-${getStatusColor(ticket.status)}">${ticket.status}</span>
              <span class="badge badge-${getPriorityColor(ticket.priority)}">${ticket.priority}</span>
              <span class="badge badge-secondary">${ticket.category}</span>
            </div>
          </div>
          <div class="ticket-actions">
            ${ticket.status === 'closed' ? `
              <button class="btn btn-secondary" id="reopen-ticket-btn">
                <span class="material-icons-outlined">lock_open</span>
                Reopen
              </button>
            ` : `
              <button class="btn btn-danger" id="close-ticket-btn">
                <span class="material-icons-outlined">check_circle</span>
                Close Ticket
              </button>
            `}
          </div>
        </div>
        
        <div class="ticket-conversation">
          <div class="messages-list">
            ${messages.map(msg => `
              <div class="message ${msg.isStaff ? 'staff-message' : 'user-message'}">
                <div class="message-avatar">
                  <span class="material-icons-outlined">${msg.isStaff ? 'support_agent' : 'person'}</span>
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-author">
                      ${escapeHtml(msg.user?.displayName || msg.user?.username || 'Unknown')}
                      ${msg.isStaff ? '<span class="staff-label">Staff</span>' : ''}
                    </span>
                    <span class="message-time">${formatTimeAgo(msg.createdAt)}</span>
                  </div>
                  <div class="message-body">${escapeHtml(msg.message).replace(/\n/g, '<br>')}</div>
                </div>
              </div>
            `).join('')}
          </div>
          
          ${ticket.status !== 'closed' ? `
            <form id="reply-form" class="reply-form">
              <textarea name="message" placeholder="Type your message..." rows="4" required></textarea>
              <button type="submit" class="btn btn-primary">
                <span class="material-icons-outlined">send</span>
                Send Reply
              </button>
            </form>
          ` : `
            <div class="ticket-closed-notice">
              <span class="material-icons-outlined">lock</span>
              <p>This ticket is closed. Reopen it to continue the conversation.</p>
            </div>
          `}
        </div>
      </div>
    `;
    
    setupTicketDetailListeners(ticketId, ticket);
    
  } catch (e) {
    app.innerHTML = `<div class="error">Failed to load ticket</div>`;
  }
}

function setupTicketDetailListeners(ticketId, ticket) {
  const replyForm = document.getElementById('reply-form');
  if (replyForm) {
    replyForm.onsubmit = async (e) => {
      e.preventDefault();
      const message = replyForm.message.value.trim();
      if (!message) return;
      
      const btn = replyForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined spinning">sync</span>';
      
      try {
        const res = await api(`/api/tickets/${ticketId}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        
        if (res.ok) {
          toast.success('Reply sent');
          await renderTicketDetail(ticketId);
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to send reply');
          btn.disabled = false;
          btn.innerHTML = '<span class="material-icons-outlined">send</span> Send Reply';
        }
      } catch (e) {
        toast.error('Failed to send reply');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons-outlined">send</span> Send Reply';
      }
    };
  }
  
  const closeBtn = document.getElementById('close-ticket-btn');
  if (closeBtn) {
    closeBtn.onclick = async () => {
      const confirmed = await modal.confirm({
        title: 'Close Ticket',
        message: 'Are you sure you want to close this ticket?'
      });
      if (!confirmed) return;
      
      try {
        const res = await api(`/api/tickets/${ticketId}/close`, { method: 'POST' });
        if (res.ok) {
          toast.success('Ticket closed');
          await renderTicketDetail(ticketId);
        } else {
          toast.error('Failed to close ticket');
        }
      } catch (e) {
        toast.error('Failed to close ticket');
      }
    };
  }
  
  const reopenBtn = document.getElementById('reopen-ticket-btn');
  if (reopenBtn) {
    reopenBtn.onclick = async () => {
      try {
        const res = await api(`/api/tickets/${ticketId}/reopen`, { method: 'POST' });
        if (res.ok) {
          toast.success('Ticket reopened');
          await renderTicketDetail(ticketId);
        } else {
          toast.error('Failed to reopen ticket');
        }
      } catch (e) {
        toast.error('Failed to reopen ticket');
      }
    };
  }
}

async function showCreateTicketModal() {
  const html = `
    <form id="create-ticket-form" class="modal-form">
      <div class="form-group">
        <label>Subject *</label>
        <input type="text" name="subject" required maxlength="200" placeholder="Brief description of your issue" />
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Category</label>
          <select name="category">
            ${ticketConfig.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select name="priority">
            ${ticketConfig.priorities.map(p => `<option value="${p}" ${p === 'Medium' ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Message *</label>
        <textarea name="message" rows="6" required placeholder="Describe your issue in detail..."></textarea>
      </div>
    </form>
  `;
  
  const confirmed = await modal.custom({
    title: 'Create Support Ticket',
    html,
    confirmText: 'Create Ticket',
    width: '600px'
  });
  
  if (!confirmed) return;
  
  const form = document.getElementById('create-ticket-form');
  const ticketData = {
    subject: form.subject.value,
    category: form.category.value,
    priority: form.priority.value,
    message: form.message.value
  };
  
  try {
    const res = await api('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    });
    
    const data = await res.json();
    
    if (data.success) {
      toast.success('Ticket created');
      window.location.href = `/tickets/${data.ticket.id}`;
    } else {
      toast.error(data.error || 'Failed to create ticket');
    }
  } catch (e) {
    toast.error('Failed to create ticket');
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

export function cleanupTickets() {}
