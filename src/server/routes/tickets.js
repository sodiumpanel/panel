import express from 'express';
import {
  loadTickets, saveTickets,
  loadTicketMessages, saveTicketMessages,
  loadUsers, loadConfig
} from '../db.js';
import { authenticateUser, requireAdmin } from '../utils/auth.js';
import { generateUUID, sanitizeText } from '../utils/helpers.js';
import { logActivity, ACTIVITY_TYPES } from '../utils/activity.js';

const router = express.Router();

function isTicketsEnabled() {
  const config = loadConfig();
  return config.tickets?.enabled !== false;
}

function getTicketConfig() {
  const config = loadConfig();
  return {
    enabled: config.tickets?.enabled !== false,
    requireEmail: config.tickets?.requireEmail || false,
    maxOpenTickets: config.tickets?.maxOpenTickets || 5,
    categories: config.tickets?.categories || ['General', 'Billing', 'Technical', 'Other'],
    priorities: config.tickets?.priorities || ['Low', 'Medium', 'High', 'Urgent']
  };
}

router.get('/config', (req, res) => {
  const ticketConfig = getTicketConfig();
  res.json({
    enabled: ticketConfig.enabled,
    categories: ticketConfig.categories,
    priorities: ticketConfig.priorities
  });
});

router.use(authenticateUser);

// ==================== USER ROUTES ====================

router.get('/', (req, res) => {
  if (!isTicketsEnabled()) {
    return res.status(403).json({ error: 'Tickets are not enabled' });
  }
  
  const data = loadTickets();
  const userTickets = data.tickets
    .filter(t => t.userId === req.user.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  res.json({ tickets: userTickets });
});

router.get('/:id', (req, res) => {
  if (!isTicketsEnabled()) {
    return res.status(403).json({ error: 'Tickets are not enabled' });
  }
  
  const data = loadTickets();
  const ticket = data.tickets.find(t => t.id === req.params.id);
  
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  if (ticket.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const messagesData = loadTicketMessages();
  const messages = messagesData.ticketMessages
    .filter(m => m.ticketId === ticket.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  const users = loadUsers();
  const messagesWithUser = messages.map(m => {
    const user = users.users.find(u => u.id === m.userId);
    return {
      ...m,
      user: user ? { 
        id: user.id, 
        username: user.username, 
        displayName: user.displayName,
        isAdmin: user.isAdmin 
      } : null
    };
  });
  
  res.json({ ticket, messages: messagesWithUser });
});

router.post('/', (req, res) => {
  if (!isTicketsEnabled()) {
    return res.status(403).json({ error: 'Tickets are not enabled' });
  }
  
  const { subject, category, priority, message } = req.body;
  const ticketConfig = getTicketConfig();
  
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }
  
  if (ticketConfig.requireEmail) {
    const users = loadUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user?.email) {
      return res.status(400).json({ error: 'Email is required to create tickets' });
    }
  }
  
  const data = loadTickets();
  const openTickets = data.tickets.filter(
    t => t.userId === req.user.id && t.status !== 'closed'
  );
  
  if (openTickets.length >= ticketConfig.maxOpenTickets) {
    return res.status(400).json({ 
      error: `Maximum of ${ticketConfig.maxOpenTickets} open tickets allowed` 
    });
  }
  
  const ticketNumber = data.tickets.length + 1;
  const now = new Date().toISOString();
  
  const ticket = {
    id: generateUUID(),
    ticketNumber,
    userId: req.user.id,
    subject: sanitizeText(subject).substring(0, 200),
    category: ticketConfig.categories.includes(category) ? category : 'General',
    priority: ticketConfig.priorities.includes(priority) ? priority : 'Medium',
    status: 'open',
    assignedTo: null,
    createdAt: now,
    updatedAt: now
  };
  
  data.tickets.push(ticket);
  saveTickets(data);
  
  const messagesData = loadTicketMessages();
  const ticketMessage = {
    id: generateUUID(),
    ticketId: ticket.id,
    userId: req.user.id,
    message: sanitizeText(message).substring(0, 10000),
    isStaff: false,
    createdAt: now
  };
  
  messagesData.ticketMessages.push(ticketMessage);
  saveTicketMessages(messagesData);
  
  logActivity(req.user.id, ACTIVITY_TYPES.SUPPORT, { 
    action: 'ticket_created', 
    ticketId: ticket.id,
    ticketNumber 
  }, req.ip);
  
  res.json({ success: true, ticket });
});

router.post('/:id/reply', (req, res) => {
  if (!isTicketsEnabled()) {
    return res.status(403).json({ error: 'Tickets are not enabled' });
  }
  
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  const data = loadTickets();
  const ticketIdx = data.tickets.findIndex(t => t.id === req.params.id);
  
  if (ticketIdx === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  const ticket = data.tickets[ticketIdx];
  
  if (ticket.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (ticket.status === 'closed') {
    return res.status(400).json({ error: 'Cannot reply to closed ticket' });
  }
  
  const now = new Date().toISOString();
  
  const messagesData = loadTicketMessages();
  const ticketMessage = {
    id: generateUUID(),
    ticketId: ticket.id,
    userId: req.user.id,
    message: sanitizeText(message).substring(0, 10000),
    isStaff: req.user.isAdmin,
    createdAt: now
  };
  
  messagesData.ticketMessages.push(ticketMessage);
  saveTicketMessages(messagesData);
  
  data.tickets[ticketIdx].updatedAt = now;
  if (req.user.isAdmin && ticket.status === 'open') {
    data.tickets[ticketIdx].status = 'answered';
  } else if (!req.user.isAdmin && ticket.status === 'answered') {
    data.tickets[ticketIdx].status = 'open';
  }
  saveTickets(data);
  
  res.json({ success: true, message: ticketMessage });
});

router.post('/:id/close', (req, res) => {
  if (!isTicketsEnabled()) {
    return res.status(403).json({ error: 'Tickets are not enabled' });
  }
  
  const data = loadTickets();
  const ticketIdx = data.tickets.findIndex(t => t.id === req.params.id);
  
  if (ticketIdx === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  const ticket = data.tickets[ticketIdx];
  
  if (ticket.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  data.tickets[ticketIdx].status = 'closed';
  data.tickets[ticketIdx].closedAt = new Date().toISOString();
  data.tickets[ticketIdx].updatedAt = new Date().toISOString();
  saveTickets(data);
  
  logActivity(req.user.id, ACTIVITY_TYPES.SUPPORT, { 
    action: 'ticket_closed', 
    ticketId: ticket.id 
  }, req.ip);
  
  res.json({ success: true });
});

router.post('/:id/reopen', (req, res) => {
  if (!isTicketsEnabled()) {
    return res.status(403).json({ error: 'Tickets are not enabled' });
  }
  
  const data = loadTickets();
  const ticketIdx = data.tickets.findIndex(t => t.id === req.params.id);
  
  if (ticketIdx === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  const ticket = data.tickets[ticketIdx];
  
  if (ticket.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (ticket.status !== 'closed') {
    return res.status(400).json({ error: 'Ticket is not closed' });
  }
  
  data.tickets[ticketIdx].status = 'open';
  data.tickets[ticketIdx].closedAt = null;
  data.tickets[ticketIdx].updatedAt = new Date().toISOString();
  saveTickets(data);
  
  res.json({ success: true });
});

// ==================== ADMIN ROUTES ====================

router.get('/admin/all', requireAdmin, (req, res) => {
  const { page = 1, per_page = 20, status, category, priority } = req.query;
  const data = loadTickets();
  const users = loadUsers();
  
  let tickets = data.tickets.map(t => {
    const user = users.users.find(u => u.id === t.userId);
    const assignee = t.assignedTo ? users.users.find(u => u.id === t.assignedTo) : null;
    return {
      ...t,
      user: user ? { id: user.id, username: user.username, email: user.email } : null,
      assignee: assignee ? { id: assignee.id, username: assignee.username } : null
    };
  });
  
  if (status) tickets = tickets.filter(t => t.status === status);
  if (category) tickets = tickets.filter(t => t.category === category);
  if (priority) tickets = tickets.filter(t => t.priority === priority);
  
  tickets.sort((a, b) => {
    const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    const statusOrder = { open: 0, answered: 1, closed: 2 };
    
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  
  const total = tickets.length;
  const totalPages = Math.ceil(total / per_page);
  const currentPage = Math.max(1, Math.min(parseInt(page), totalPages || 1));
  const start = (currentPage - 1) * per_page;
  const paginatedTickets = tickets.slice(start, start + parseInt(per_page));
  
  res.json({
    tickets: paginatedTickets,
    meta: { current_page: currentPage, per_page: parseInt(per_page), total, total_pages: totalPages }
  });
});

router.get('/admin/stats', requireAdmin, (req, res) => {
  const data = loadTickets();
  
  const stats = {
    total: data.tickets.length,
    open: data.tickets.filter(t => t.status === 'open').length,
    answered: data.tickets.filter(t => t.status === 'answered').length,
    closed: data.tickets.filter(t => t.status === 'closed').length,
    byCategory: {},
    byPriority: {}
  };
  
  const ticketConfig = getTicketConfig();
  ticketConfig.categories.forEach(c => {
    stats.byCategory[c] = data.tickets.filter(t => t.category === c && t.status !== 'closed').length;
  });
  ticketConfig.priorities.forEach(p => {
    stats.byPriority[p] = data.tickets.filter(t => t.priority === p && t.status !== 'closed').length;
  });
  
  res.json(stats);
});

router.put('/admin/:id', requireAdmin, (req, res) => {
  const { status, priority, category, assignedTo } = req.body;
  const data = loadTickets();
  const idx = data.tickets.findIndex(t => t.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  const ticketConfig = getTicketConfig();
  
  if (status) data.tickets[idx].status = status;
  if (priority && ticketConfig.priorities.includes(priority)) {
    data.tickets[idx].priority = priority;
  }
  if (category && ticketConfig.categories.includes(category)) {
    data.tickets[idx].category = category;
  }
  if (assignedTo !== undefined) {
    data.tickets[idx].assignedTo = assignedTo;
  }
  
  data.tickets[idx].updatedAt = new Date().toISOString();
  saveTickets(data);
  
  res.json({ success: true, ticket: data.tickets[idx] });
});

router.delete('/admin/:id', requireAdmin, (req, res) => {
  const data = loadTickets();
  const messagesData = loadTicketMessages();
  
  data.tickets = data.tickets.filter(t => t.id !== req.params.id);
  messagesData.ticketMessages = messagesData.ticketMessages.filter(m => m.ticketId !== req.params.id);
  
  saveTickets(data);
  saveTicketMessages(messagesData);
  
  res.json({ success: true });
});

export default router;
