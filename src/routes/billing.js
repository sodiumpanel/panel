import { api, getUser } from '../utils/api.js';
import { escapeHtml } from '../utils/security.js';
import * as toast from '../utils/toast.js';
import * as modal from '../utils/modal.js';

let billingConfig = null;

export async function renderBilling() {
  const app = document.getElementById('app');
  const user = getUser();
  
  if (!user) {
    window.location.href = '/auth';
    return;
  }
  
  app.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const [configRes, requirementsRes, subscriptionRes, plansRes] = await Promise.all([
      api('/api/billing/config'),
      api('/api/billing/requirements'),
      api('/api/billing/my/subscription'),
      api('/api/billing/plans')
    ]);
    
    billingConfig = await configRes.json();
    const requirements = await requirementsRes.json();
    const { subscription } = await subscriptionRes.json();
    const { plans } = await plansRes.json();
    
    if (!billingConfig.enabled) {
      app.innerHTML = `
        <div class="page-container">
          <div class="empty-state">
            <span class="material-icons-outlined">payments_off</span>
            <h2>Billing Not Available</h2>
            <p>Billing is currently disabled on this panel.</p>
            <a href="/dashboard" class="btn btn-primary">Back to Dashboard</a>
          </div>
        </div>
      `;
      return;
    }
    
    const symbol = billingConfig.currencySymbol || '$';
    
    app.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1>Billing</h1>
          <p>Manage your subscription and payments</p>
        </div>
        
        ${!requirements.met ? `
          <div class="alert alert-warning">
            <span class="material-icons-outlined">warning</span>
            <div>
              <strong>Requirements Not Met</strong>
              <ul>
                ${requirements.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
              </ul>
              <a href="/settings" class="btn btn-sm btn-primary" style="margin-top: 0.5rem;">Update Profile</a>
            </div>
          </div>
        ` : ''}
        
        <div class="billing-layout">
          <div class="billing-main">
            ${subscription ? renderCurrentSubscription(subscription, symbol) : renderNoSubscription()}
            
            ${!subscription ? `
              <div class="detail-card">
                <h2>Available Plans</h2>
                <div class="plans-grid">
                  ${plans.length === 0 ? `
                    <p class="text-muted">No plans available at this time.</p>
                  ` : plans.sort((a, b) => a.sortOrder - b.sortOrder).map(plan => `
                    <div class="plan-card">
                      <div class="plan-header">
                        <h3>${escapeHtml(plan.name)}</h3>
                      </div>
                      <div class="plan-price">
                        <span class="price-amount">${symbol}${plan.price.toFixed(2)}</span>
                        <span class="price-cycle">/${plan.billingCycle}</span>
                      </div>
                      <p class="plan-description">${escapeHtml(plan.description || '')}</p>
                      <ul class="plan-features">
                        <li><span class="material-icons-outlined">dns</span> ${plan.limits?.servers || 0} Servers</li>
                        <li><span class="material-icons-outlined">memory</span> ${plan.limits?.memory || 0} MB RAM</li>
                        <li><span class="material-icons-outlined">storage</span> ${plan.limits?.disk || 0} MB Disk</li>
                        <li><span class="material-icons-outlined">speed</span> ${plan.limits?.cpu || 0}% CPU</li>
                      </ul>
                      <button class="btn btn-primary btn-block subscribe-btn" 
                              data-plan-id="${plan.id}" 
                              ${!requirements.met ? 'disabled' : ''}>
                        ${plan.price === 0 ? 'Activate Free Plan' : 'Subscribe'}
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          
          <aside class="billing-sidebar">
            <div class="detail-card">
              <h3>Payment History</h3>
              <div id="payment-history">
                <div class="loading-spinner"></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;
    
    loadPaymentHistory(symbol);
    setupEventListeners(requirements.met);
    
  } catch (e) {
    app.innerHTML = `<div class="error">Failed to load billing information</div>`;
  }
}

function renderCurrentSubscription(subscription, symbol) {
  const plan = subscription.plan;
  const expiresDate = new Date(subscription.currentPeriodEnd);
  const isExpiringSoon = expiresDate - new Date() < 7 * 24 * 60 * 60 * 1000;
  
  return `
    <div class="detail-card subscription-card">
      <div class="subscription-header">
        <div>
          <h2>Current Subscription</h2>
          <span class="badge badge-${subscription.status === 'active' ? 'success' : 'warning'}">${subscription.status}</span>
        </div>
      </div>
      
      <div class="subscription-details">
        <div class="subscription-plan">
          <h3>${escapeHtml(plan?.name || 'Unknown Plan')}</h3>
          <p class="plan-price">${symbol}${(plan?.price || 0).toFixed(2)}/${plan?.billingCycle || 'month'}</p>
        </div>
        
        <div class="subscription-info">
          <div class="info-item">
            <span class="info-label">Started</span>
            <span class="info-value">${formatDate(subscription.currentPeriodStart)}</span>
          </div>
          <div class="info-item ${isExpiringSoon ? 'expiring-soon' : ''}">
            <span class="info-label">Expires</span>
            <span class="info-value">${formatDate(subscription.currentPeriodEnd)}</span>
          </div>
        </div>
        
        <div class="subscription-limits">
          <h4>Your Limits</h4>
          <div class="limits-grid">
            <div class="limit-item">
              <span class="limit-value">${plan?.limits?.servers || 0}</span>
              <span class="limit-label">Servers</span>
            </div>
            <div class="limit-item">
              <span class="limit-value">${plan?.limits?.memory || 0}</span>
              <span class="limit-label">MB RAM</span>
            </div>
            <div class="limit-item">
              <span class="limit-value">${plan?.limits?.disk || 0}</span>
              <span class="limit-label">MB Disk</span>
            </div>
            <div class="limit-item">
              <span class="limit-value">${plan?.limits?.cpu || 0}%</span>
              <span class="limit-label">CPU</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="subscription-actions">
        <button class="btn btn-danger" id="cancel-subscription-btn">Cancel Subscription</button>
      </div>
    </div>
  `;
}

function renderNoSubscription() {
  return `
    <div class="detail-card">
      <div class="empty-subscription">
        <span class="material-icons-outlined">card_membership</span>
        <h3>No Active Subscription</h3>
        <p>Choose a plan below to get started.</p>
      </div>
    </div>
  `;
}

async function loadPaymentHistory(symbol) {
  const container = document.getElementById('payment-history');
  if (!container) return;
  
  try {
    const [invoicesRes, paymentsRes] = await Promise.all([
      api('/api/billing/my/invoices'),
      api('/api/billing/my/payments')
    ]);
    
    const { invoices } = await invoicesRes.json();
    const { payments } = await paymentsRes.json();
    
    if (invoices.length === 0 && payments.length === 0) {
      container.innerHTML = '<p class="text-muted">No payment history</p>';
      return;
    }
    
    const pendingInvoices = invoices.filter(i => i.status === 'pending');
    
    container.innerHTML = `
      ${pendingInvoices.length > 0 ? `
        <div class="pending-invoices">
          <h4>Pending Invoices</h4>
          ${pendingInvoices.map(inv => `
            <div class="invoice-item pending">
              <div class="invoice-info">
                <span class="invoice-amount">${symbol}${inv.total.toFixed(2)}</span>
                <span class="invoice-date">Due: ${formatDate(inv.dueDate)}</span>
              </div>
              <span class="badge badge-warning">Pending</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="payment-list">
        <h4>Recent Payments</h4>
        ${payments.slice(0, 5).map(pay => `
          <div class="payment-item">
            <div class="payment-info">
              <span class="payment-amount">${symbol}${(pay.amount || 0).toFixed(2)}</span>
              <span class="payment-date">${formatDate(pay.createdAt)}</span>
            </div>
            <span class="badge badge-${pay.status === 'completed' ? 'success' : 'secondary'}">${pay.status}</span>
          </div>
        `).join('')}
        ${payments.length === 0 ? '<p class="text-muted">No payments yet</p>' : ''}
      </div>
    `;
  } catch (e) {
    container.innerHTML = '<p class="text-muted">Failed to load history</p>';
  }
}

function setupEventListeners(requirementsMet) {
  document.querySelectorAll('.subscribe-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!requirementsMet) {
        toast.error('Please complete your profile requirements first');
        return;
      }
      
      const planId = btn.dataset.planId;
      
      const confirmed = await modal.confirm({
        title: 'Subscribe to Plan',
        message: 'Are you sure you want to subscribe to this plan?'
      });
      
      if (!confirmed) return;
      
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined spinning">sync</span>';
      
      try {
        const res = await api('/api/billing/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId })
        });
        
        const data = await res.json();
        
        if (data.success) {
          toast.success(data.message || 'Subscription created');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(data.error || 'Failed to subscribe');
          btn.disabled = false;
          btn.textContent = 'Subscribe';
        }
      } catch (e) {
        toast.error('Failed to subscribe');
        btn.disabled = false;
        btn.textContent = 'Subscribe';
      }
    };
  });
  
  const cancelBtn = document.getElementById('cancel-subscription-btn');
  if (cancelBtn) {
    cancelBtn.onclick = async () => {
      const confirmed = await modal.confirm({
        title: 'Cancel Subscription',
        message: 'Are you sure you want to cancel your subscription? You will lose access to your current plan benefits.',
        danger: true
      });
      
      if (!confirmed) return;
      
      try {
        const res = await api('/api/billing/cancel', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          toast.success('Subscription cancelled');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error(data.error || 'Failed to cancel');
        }
      } catch (e) {
        toast.error('Failed to cancel subscription');
      }
    };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
}

export function cleanupBilling() {}
