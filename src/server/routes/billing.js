import express from 'express';
import {
  loadBillingPlans, saveBillingPlans,
  loadBillingSubscriptions, saveBillingSubscriptions,
  loadBillingPayments, saveBillingPayments,
  loadBillingInvoices, saveBillingInvoices,
  loadUsers, saveUsers,
  loadConfig, saveConfig
} from '../db.js';
import { authenticateUser, requireAdmin } from '../utils/auth.js';
import { generateUUID, sanitizeText } from '../utils/helpers.js';
import { logActivity, ACTIVITY_TYPES } from '../utils/activity.js';

const router = express.Router();

function isBillingEnabled() {
  const config = loadConfig();
  return config.billing?.enabled || false;
}

function checkBillingRequirements(user) {
  const config = loadConfig();
  const errors = [];
  
  if (config.billing?.requireEmail && !user.email) {
    errors.push('Email address is required for billing');
  }
  
  if (config.billing?.requireEmailVerification && !user.emailVerified) {
    errors.push('Email verification is required for billing');
  }
  
  return errors;
}

// ==================== PUBLIC ROUTES ====================

router.get('/config', (req, res) => {
  const config = loadConfig();
  res.json({
    enabled: config.billing?.enabled || false,
    currency: config.billing?.currency || 'USD',
    currencySymbol: config.billing?.currencySymbol || '$',
    requireEmail: config.billing?.requireEmail || false,
    requireEmailVerification: config.billing?.requireEmailVerification || false,
    paymentMethods: {
      stripe: config.billing?.paymentMethods?.stripe?.enabled || false,
      paypal: config.billing?.paymentMethods?.paypal?.enabled || false,
      manual: config.billing?.paymentMethods?.manual?.enabled || false
    }
  });
});

router.get('/plans', (req, res) => {
  if (!isBillingEnabled()) {
    return res.status(403).json({ error: 'Billing is not enabled' });
  }
  
  const data = loadBillingPlans();
  const activePlans = data.billingPlans.filter(p => p.active && p.visible);
  res.json({ plans: activePlans });
});

router.get('/plans/:id', (req, res) => {
  if (!isBillingEnabled()) {
    return res.status(403).json({ error: 'Billing is not enabled' });
  }
  
  const data = loadBillingPlans();
  const plan = data.billingPlans.find(p => p.id === req.params.id && p.active);
  
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  
  res.json({ plan });
});

// ==================== USER ROUTES ====================

router.use(authenticateUser);

router.get('/requirements', (req, res) => {
  const users = loadUsers();
  const user = users.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const errors = checkBillingRequirements(user);
  res.json({
    met: errors.length === 0,
    errors,
    email: user.email || null,
    emailVerified: user.emailVerified || false
  });
});

router.get('/my/subscription', (req, res) => {
  if (!isBillingEnabled()) {
    return res.status(403).json({ error: 'Billing is not enabled' });
  }
  
  const data = loadBillingSubscriptions();
  const subscription = data.billingSubscriptions.find(
    s => s.userId === req.user.id && s.status === 'active'
  );
  
  if (!subscription) {
    return res.json({ subscription: null });
  }
  
  const plans = loadBillingPlans();
  const plan = plans.billingPlans.find(p => p.id === subscription.planId);
  
  res.json({ subscription: { ...subscription, plan } });
});

router.get('/my/invoices', (req, res) => {
  if (!isBillingEnabled()) {
    return res.status(403).json({ error: 'Billing is not enabled' });
  }
  
  const data = loadBillingInvoices();
  const invoices = data.billingInvoices
    .filter(i => i.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ invoices });
});

router.get('/my/payments', (req, res) => {
  if (!isBillingEnabled()) {
    return res.status(403).json({ error: 'Billing is not enabled' });
  }
  
  const data = loadBillingPayments();
  const payments = data.billingPayments
    .filter(p => p.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ payments });
});

router.post('/subscribe', async (req, res) => {
  if (!isBillingEnabled()) {
    return res.status(403).json({ error: 'Billing is not enabled' });
  }
  
  const { planId, paymentMethod } = req.body;
  
  if (!planId) {
    return res.status(400).json({ error: 'Plan ID is required' });
  }
  
  const users = loadUsers();
  const user = users.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const requirements = checkBillingRequirements(user);
  if (requirements.length > 0) {
    return res.status(400).json({ error: requirements[0], requirements });
  }
  
  const plans = loadBillingPlans();
  const plan = plans.billingPlans.find(p => p.id === planId && p.active);
  
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found or inactive' });
  }
  
  const subs = loadBillingSubscriptions();
  const existingSub = subs.billingSubscriptions.find(
    s => s.userId === req.user.id && s.status === 'active'
  );
  
  if (existingSub) {
    return res.status(400).json({ error: 'You already have an active subscription' });
  }
  
  const now = new Date();
  const periodEnd = new Date(now);
  if (plan.billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else if (plan.billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else if (plan.billingCycle === 'weekly') {
    periodEnd.setDate(periodEnd.getDate() + 7);
  }
  
  const subscription = {
    id: generateUUID(),
    userId: req.user.id,
    planId: plan.id,
    status: plan.price === 0 ? 'active' : 'pending',
    paymentMethod: paymentMethod || 'manual',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  
  subs.billingSubscriptions.push(subscription);
  saveBillingSubscriptions(subs);
  
  if (plan.price > 0) {
    const invoices = loadBillingInvoices();
    const config = loadConfig();
    const taxAmount = plan.price * (config.billing?.taxRate || 0) / 100;
    
    const invoice = {
      id: generateUUID(),
      userId: req.user.id,
      subscriptionId: subscription.id,
      planId: plan.id,
      amount: plan.price,
      tax: taxAmount,
      total: plan.price + taxAmount,
      currency: config.billing?.currency || 'USD',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now.toISOString()
    };
    
    invoices.billingInvoices.push(invoice);
    saveBillingInvoices(invoices);
    
    logActivity(req.user.id, ACTIVITY_TYPES.BILLING, { 
      action: 'invoice_created', 
      invoiceId: invoice.id,
      amount: invoice.total 
    }, req.ip);
    
    res.json({ 
      success: true, 
      subscription, 
      invoice,
      message: 'Subscription created. Please complete payment.' 
    });
  } else {
    applyPlanLimits(user, plan);
    users.users = users.users.map(u => u.id === user.id ? user : u);
    saveUsers(users);
    
    logActivity(req.user.id, ACTIVITY_TYPES.BILLING, { 
      action: 'subscription_activated', 
      planId: plan.id 
    }, req.ip);
    
    res.json({ 
      success: true, 
      subscription,
      message: 'Free plan activated successfully' 
    });
  }
});

router.post('/cancel', (req, res) => {
  if (!isBillingEnabled()) {
    return res.status(403).json({ error: 'Billing is not enabled' });
  }
  
  const subs = loadBillingSubscriptions();
  const subIdx = subs.billingSubscriptions.findIndex(
    s => s.userId === req.user.id && s.status === 'active'
  );
  
  if (subIdx === -1) {
    return res.status(404).json({ error: 'No active subscription found' });
  }
  
  subs.billingSubscriptions[subIdx].status = 'cancelled';
  subs.billingSubscriptions[subIdx].cancelledAt = new Date().toISOString();
  subs.billingSubscriptions[subIdx].updatedAt = new Date().toISOString();
  saveBillingSubscriptions(subs);
  
  logActivity(req.user.id, ACTIVITY_TYPES.BILLING, { 
    action: 'subscription_cancelled' 
  }, req.ip);
  
  res.json({ success: true, message: 'Subscription cancelled' });
});

function applyPlanLimits(user, plan) {
  if (plan.limits) {
    user.limits = {
      ...user.limits,
      servers: plan.limits.servers ?? user.limits?.servers,
      memory: plan.limits.memory ?? user.limits?.memory,
      disk: plan.limits.disk ?? user.limits?.disk,
      cpu: plan.limits.cpu ?? user.limits?.cpu,
      backups: plan.limits.backups ?? user.limits?.backups,
      allocations: plan.limits.allocations ?? user.limits?.allocations
    };
  }
}

// ==================== ADMIN ROUTES ====================

router.use('/admin', requireAdmin);

router.get('/admin/stats', (req, res) => {
  const plans = loadBillingPlans();
  const subs = loadBillingSubscriptions();
  const payments = loadBillingPayments();
  const invoices = loadBillingInvoices();
  
  const activeSubs = subs.billingSubscriptions.filter(s => s.status === 'active').length;
  const totalRevenue = payments.billingPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingInvoices = invoices.billingInvoices.filter(i => i.status === 'pending').length;
  const overdueInvoices = invoices.billingInvoices.filter(i => 
    i.status === 'pending' && new Date(i.dueDate) < new Date()
  ).length;
  
  res.json({
    plans: plans.billingPlans.length,
    activePlans: plans.billingPlans.filter(p => p.active).length,
    subscriptions: subs.billingSubscriptions.length,
    activeSubscriptions: activeSubs,
    payments: payments.billingPayments.length,
    totalRevenue,
    pendingInvoices,
    overdueInvoices
  });
});

router.get('/admin/plans', (req, res) => {
  const data = loadBillingPlans();
  res.json({ plans: data.billingPlans });
});

router.post('/admin/plans', (req, res) => {
  const { plan } = req.body;
  
  if (!plan?.name || plan.price === undefined) {
    return res.status(400).json({ error: 'Plan name and price are required' });
  }
  
  const data = loadBillingPlans();
  const newPlan = {
    id: generateUUID(),
    name: sanitizeText(plan.name),
    description: sanitizeText(plan.description || ''),
    price: parseFloat(plan.price) || 0,
    billingCycle: plan.billingCycle || 'monthly',
    features: plan.features || [],
    limits: {
      servers: parseInt(plan.limits?.servers) || 2,
      memory: parseInt(plan.limits?.memory) || 2048,
      disk: parseInt(plan.limits?.disk) || 10240,
      cpu: parseInt(plan.limits?.cpu) || 200,
      backups: parseInt(plan.limits?.backups) || 3,
      allocations: parseInt(plan.limits?.allocations) || 5
    },
    active: plan.active !== false,
    visible: plan.visible !== false,
    sortOrder: parseInt(plan.sortOrder) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  data.billingPlans.push(newPlan);
  saveBillingPlans(data);
  
  res.json({ success: true, plan: newPlan });
});

router.put('/admin/plans/:id', (req, res) => {
  const { plan } = req.body;
  const data = loadBillingPlans();
  const idx = data.billingPlans.findIndex(p => p.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  
  const current = data.billingPlans[idx];
  data.billingPlans[idx] = {
    ...current,
    name: plan.name ? sanitizeText(plan.name) : current.name,
    description: plan.description !== undefined ? sanitizeText(plan.description) : current.description,
    price: plan.price !== undefined ? parseFloat(plan.price) : current.price,
    billingCycle: plan.billingCycle || current.billingCycle,
    features: plan.features || current.features,
    limits: plan.limits ? {
      servers: parseInt(plan.limits.servers) ?? current.limits?.servers,
      memory: parseInt(plan.limits.memory) ?? current.limits?.memory,
      disk: parseInt(plan.limits.disk) ?? current.limits?.disk,
      cpu: parseInt(plan.limits.cpu) ?? current.limits?.cpu,
      backups: parseInt(plan.limits.backups) ?? current.limits?.backups,
      allocations: parseInt(plan.limits.allocations) ?? current.limits?.allocations
    } : current.limits,
    active: plan.active !== undefined ? plan.active : current.active,
    visible: plan.visible !== undefined ? plan.visible : current.visible,
    sortOrder: plan.sortOrder !== undefined ? parseInt(plan.sortOrder) : current.sortOrder,
    updatedAt: new Date().toISOString()
  };
  
  saveBillingPlans(data);
  res.json({ success: true, plan: data.billingPlans[idx] });
});

router.delete('/admin/plans/:id', (req, res) => {
  const data = loadBillingPlans();
  const subs = loadBillingSubscriptions();
  
  const activeSubs = subs.billingSubscriptions.filter(
    s => s.planId === req.params.id && s.status === 'active'
  );
  
  if (activeSubs.length > 0) {
    return res.status(400).json({ 
      error: `Cannot delete plan with ${activeSubs.length} active subscriptions` 
    });
  }
  
  data.billingPlans = data.billingPlans.filter(p => p.id !== req.params.id);
  saveBillingPlans(data);
  
  res.json({ success: true });
});

router.get('/admin/subscriptions', (req, res) => {
  const { page = 1, per_page = 20, status } = req.query;
  const data = loadBillingSubscriptions();
  const plans = loadBillingPlans();
  const users = loadUsers();
  
  let subs = data.billingSubscriptions.map(s => {
    const plan = plans.billingPlans.find(p => p.id === s.planId);
    const user = users.users.find(u => u.id === s.userId);
    return {
      ...s,
      plan: plan ? { id: plan.id, name: plan.name, price: plan.price } : null,
      user: user ? { id: user.id, username: user.username, email: user.email } : null
    };
  });
  
  if (status) {
    subs = subs.filter(s => s.status === status);
  }
  
  subs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const total = subs.length;
  const totalPages = Math.ceil(total / per_page);
  const currentPage = Math.max(1, Math.min(parseInt(page), totalPages || 1));
  const start = (currentPage - 1) * per_page;
  const paginatedSubs = subs.slice(start, start + parseInt(per_page));
  
  res.json({
    subscriptions: paginatedSubs,
    meta: { current_page: currentPage, per_page: parseInt(per_page), total, total_pages: totalPages }
  });
});

router.put('/admin/subscriptions/:id', (req, res) => {
  const { status } = req.body;
  const data = loadBillingSubscriptions();
  const idx = data.billingSubscriptions.findIndex(s => s.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Subscription not found' });
  }
  
  const oldStatus = data.billingSubscriptions[idx].status;
  data.billingSubscriptions[idx].status = status;
  data.billingSubscriptions[idx].updatedAt = new Date().toISOString();
  
  if (status === 'active' && oldStatus !== 'active') {
    const plans = loadBillingPlans();
    const plan = plans.billingPlans.find(p => p.id === data.billingSubscriptions[idx].planId);
    
    if (plan) {
      const users = loadUsers();
      const user = users.users.find(u => u.id === data.billingSubscriptions[idx].userId);
      if (user) {
        applyPlanLimits(user, plan);
        users.users = users.users.map(u => u.id === user.id ? user : u);
        saveUsers(users);
      }
    }
  }
  
  saveBillingSubscriptions(data);
  res.json({ success: true, subscription: data.billingSubscriptions[idx] });
});

router.get('/admin/invoices', (req, res) => {
  const { page = 1, per_page = 20, status } = req.query;
  const data = loadBillingInvoices();
  const users = loadUsers();
  
  let invoices = data.billingInvoices.map(i => {
    const user = users.users.find(u => u.id === i.userId);
    return {
      ...i,
      user: user ? { id: user.id, username: user.username, email: user.email } : null
    };
  });
  
  if (status) {
    invoices = invoices.filter(i => i.status === status);
  }
  
  invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const total = invoices.length;
  const totalPages = Math.ceil(total / per_page);
  const currentPage = Math.max(1, Math.min(parseInt(page), totalPages || 1));
  const start = (currentPage - 1) * per_page;
  const paginatedInvoices = invoices.slice(start, start + parseInt(per_page));
  
  res.json({
    invoices: paginatedInvoices,
    meta: { current_page: currentPage, per_page: parseInt(per_page), total, total_pages: totalPages }
  });
});

router.put('/admin/invoices/:id', (req, res) => {
  const { status } = req.body;
  const data = loadBillingInvoices();
  const idx = data.billingInvoices.findIndex(i => i.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  const invoice = data.billingInvoices[idx];
  invoice.status = status;
  invoice.updatedAt = new Date().toISOString();
  
  if (status === 'paid') {
    invoice.paidAt = new Date().toISOString();
    
    const payments = loadBillingPayments();
    const payment = {
      id: generateUUID(),
      userId: invoice.userId,
      invoiceId: invoice.id,
      subscriptionId: invoice.subscriptionId,
      amount: invoice.total,
      currency: invoice.currency,
      method: 'manual',
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    payments.billingPayments.push(payment);
    saveBillingPayments(payments);
    
    if (invoice.subscriptionId) {
      const subs = loadBillingSubscriptions();
      const subIdx = subs.billingSubscriptions.findIndex(s => s.id === invoice.subscriptionId);
      if (subIdx !== -1) {
        subs.billingSubscriptions[subIdx].status = 'active';
        subs.billingSubscriptions[subIdx].updatedAt = new Date().toISOString();
        saveBillingSubscriptions(subs);
        
        const plans = loadBillingPlans();
        const plan = plans.billingPlans.find(p => p.id === subs.billingSubscriptions[subIdx].planId);
        if (plan) {
          const users = loadUsers();
          const user = users.users.find(u => u.id === invoice.userId);
          if (user) {
            applyPlanLimits(user, plan);
            users.users = users.users.map(u => u.id === user.id ? user : u);
            saveUsers(users);
          }
        }
      }
    }
  }
  
  saveBillingInvoices(data);
  res.json({ success: true, invoice });
});

router.get('/admin/payments', (req, res) => {
  const { page = 1, per_page = 20 } = req.query;
  const data = loadBillingPayments();
  const users = loadUsers();
  
  let payments = data.billingPayments.map(p => {
    const user = users.users.find(u => u.id === p.userId);
    return {
      ...p,
      user: user ? { id: user.id, username: user.username, email: user.email } : null
    };
  });
  
  payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const total = payments.length;
  const totalPages = Math.ceil(total / per_page);
  const currentPage = Math.max(1, Math.min(parseInt(page), totalPages || 1));
  const start = (currentPage - 1) * per_page;
  const paginatedPayments = payments.slice(start, start + parseInt(per_page));
  
  res.json({
    payments: paginatedPayments,
    meta: { current_page: currentPage, per_page: parseInt(per_page), total, total_pages: totalPages }
  });
});

router.get('/admin/settings', (req, res) => {
  const config = loadConfig();
  res.json({ billing: config.billing || {}, tickets: config.tickets || {} });
});

router.put('/admin/settings', (req, res) => {
  const { billing, tickets } = req.body;
  const config = loadConfig();
  
  if (billing) {
    config.billing = {
      ...config.billing,
      enabled: billing.enabled !== undefined ? Boolean(billing.enabled) : config.billing?.enabled,
      requireEmail: billing.requireEmail !== undefined ? Boolean(billing.requireEmail) : config.billing?.requireEmail,
      requireEmailVerification: billing.requireEmailVerification !== undefined ? Boolean(billing.requireEmailVerification) : config.billing?.requireEmailVerification,
      currency: billing.currency || config.billing?.currency || 'USD',
      currencySymbol: billing.currencySymbol || config.billing?.currencySymbol || '$',
      taxRate: billing.taxRate !== undefined ? parseFloat(billing.taxRate) : config.billing?.taxRate || 0,
      gracePeriodDays: billing.gracePeriodDays !== undefined ? parseInt(billing.gracePeriodDays) : config.billing?.gracePeriodDays || 3
    };
    
    if (billing.paymentMethods) {
      config.billing.paymentMethods = {
        ...config.billing.paymentMethods,
        stripe: billing.paymentMethods.stripe ? {
          ...config.billing.paymentMethods?.stripe,
          ...billing.paymentMethods.stripe
        } : config.billing.paymentMethods?.stripe,
        paypal: billing.paymentMethods.paypal ? {
          ...config.billing.paymentMethods?.paypal,
          ...billing.paymentMethods.paypal
        } : config.billing.paymentMethods?.paypal,
        manual: billing.paymentMethods.manual ? {
          ...config.billing.paymentMethods?.manual,
          ...billing.paymentMethods.manual
        } : config.billing.paymentMethods?.manual
      };
    }
    
    if (billing.notifications) {
      config.billing.notifications = {
        ...config.billing.notifications,
        ...billing.notifications
      };
    }
  }
  
  if (tickets) {
    config.tickets = {
      ...config.tickets,
      enabled: tickets.enabled !== undefined ? Boolean(tickets.enabled) : config.tickets?.enabled,
      requireEmail: tickets.requireEmail !== undefined ? Boolean(tickets.requireEmail) : config.tickets?.requireEmail,
      maxOpenTickets: tickets.maxOpenTickets !== undefined ? parseInt(tickets.maxOpenTickets) : config.tickets?.maxOpenTickets || 5,
      categories: tickets.categories || config.tickets?.categories,
      priorities: tickets.priorities || config.tickets?.priorities
    };
  }
  
  saveConfig(config);
  res.json({ success: true, billing: config.billing, tickets: config.tickets });
});

export default router;
