# Billing System

## Overview

Sodium includes a built-in billing system that allows you to sell subscription plans to users. The system supports multiple payment providers, discount coupons, automatic server suspension on non-payment, and PDF invoice generation.

## Features

- Subscription plans with configurable resource limits
- Multiple billing cycles: weekly, monthly, yearly
- Payment providers: Stripe, PayPal, manual payments
- Discount coupons with percentage or fixed amount
- Automatic server suspension when subscriptions expire
- Plan upgrades and downgrades with proration
- PDF invoice generation
- Email notifications for invoices and payments

## Enabling Billing

1. Go to **Admin > Billing > Settings**
2. Enable the **Enable Billing** toggle
3. Configure your preferred payment methods
4. Create at least one plan

## Configuration

Billing settings are stored in `data/config.json` under the `billing` key:

```json
{
  "billing": {
    "enabled": true,
    "requireEmail": true,
    "requireEmailVerification": true,
    "autoSuspend": true,
    "currency": "USD",
    "currencySymbol": "$",
    "taxRate": 0,
    "gracePeriodDays": 3,
    "paymentMethods": {
      "stripe": {
        "enabled": false,
        "publicKey": "",
        "secretKey": "",
        "webhookSecret": ""
      },
      "paypal": {
        "enabled": false,
        "clientId": "",
        "clientSecret": "",
        "sandbox": true
      },
      "manual": {
        "enabled": true,
        "instructions": "Contact admin for payment"
      }
    },
    "notifications": {
      "invoiceCreated": true,
      "paymentReceived": true,
      "subscriptionExpiring": true
    }
  }
}
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | boolean | Enable or disable the billing system |
| `requireEmail` | boolean | Require users to have an email address |
| `requireEmailVerification` | boolean | Require email verification before billing |
| `autoSuspend` | boolean | Automatically suspend servers when subscription expires |
| `currency` | string | Currency code (USD, EUR, etc.) |
| `currencySymbol` | string | Currency symbol for display |
| `taxRate` | number | Tax percentage to add to invoices |
| `gracePeriodDays` | number | Days after expiration before suspension |

## Payment Providers

### Stripe

Stripe is recommended for credit card payments.

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. In Admin > Billing > Settings, enable Stripe and enter:
   - **Public Key**: Starts with `pk_`
   - **Secret Key**: Starts with `sk_`
   - **Webhook Secret**: Starts with `whsec_`

**Setting up webhooks:**

1. In Stripe Dashboard, go to Developers > Webhooks
2. Add endpoint: `https://your-panel.com/api/billing/stripe/webhook`
3. Select event: `checkout.session.completed`
4. Copy the webhook signing secret to your panel settings

### PayPal

PayPal supports PayPal balance and credit card payments.

1. Create a PayPal Developer account at [developer.paypal.com](https://developer.paypal.com)
2. Create a REST API app
3. In Admin > Billing > Settings, enable PayPal and enter:
   - **Client ID**: From your PayPal app
   - **Client Secret**: From your PayPal app
   - **Sandbox Mode**: Enable for testing

### Manual Payments

Manual payments allow users to pay through bank transfer, cryptocurrency, or other methods. The admin must manually mark invoices as paid.

1. Enable Manual Payments in settings
2. Add payment instructions (bank details, crypto address, etc.)
3. When payment is received, go to Admin > Billing > Invoices and click "Mark Paid"

## Plans

Plans define what resources users receive when they subscribe.

### Creating a Plan

1. Go to **Admin > Billing > Plans**
2. Click **Create Plan**
3. Fill in the details:
   - **Name**: Plan display name
   - **Price**: Amount per billing cycle
   - **Billing Cycle**: weekly, monthly, or yearly
   - **Resource Limits**: servers, memory, disk, CPU, backups, allocations
4. Enable **Active** and **Visible** to make the plan available

### Resource Limits

When a user subscribes to a plan, their account limits are updated:

| Limit | Description |
|-------|-------------|
| Servers | Maximum number of servers |
| Memory | Total RAM in MB across all servers |
| Disk | Total disk space in MB across all servers |
| CPU | Total CPU percentage (100 = 1 core) |
| Backups | Maximum backups per server |
| Allocations | Maximum port allocations |

## Coupons

Coupons provide discounts on subscriptions.

### Creating a Coupon

1. Go to **Admin > Billing > Coupons**
2. Click **Create Coupon**
3. Configure the coupon:
   - **Code**: The code users will enter (automatically uppercased)
   - **Type**: Percentage or Fixed amount
   - **Value**: Discount amount (e.g., 20 for 20% or $20)
   - **Max Uses**: Leave empty for unlimited
   - **Expires At**: Optional expiration date
   - **Applicable Plans**: Leave empty to apply to all plans

### Coupon Types

| Type | Example | Result |
|------|---------|--------|
| Percentage | 20% on $50 plan | User pays $40 |
| Fixed | $10 on $50 plan | User pays $40 |

## Subscriptions

### User Flow

1. User visits `/billing`
2. Selects a plan
3. Optionally enters a coupon code
4. Confirms subscription
5. Completes payment via Stripe, PayPal, or receives manual payment instructions
6. Upon payment, subscription activates and limits are applied

### Subscription Status

| Status | Description |
|--------|-------------|
| Active | Subscription is active and user has access |
| Pending | Waiting for payment |
| Cancelled | User cancelled the subscription |
| Expired | Subscription period ended without renewal |

### Upgrading or Downgrading

Users can change plans while subscribed:

1. Go to `/billing`
2. Click **Change Plan**
3. Select a new plan
4. Review proration (credit from unused time applied to new plan)
5. Complete payment if upgrading

**Proration calculation:**
- Unused days on current plan are credited
- Credit is applied to the new plan cost
- If credit exceeds new plan cost, no payment is required

## Automatic Suspension

When `autoSuspend` is enabled:

1. Subscription expires
2. Grace period begins (default 3 days)
3. During grace period, users receive email reminders
4. After grace period, user and all their servers are suspended
5. Suspended servers cannot be started or accessed
6. Upon payment, suspension is automatically lifted

## Invoices

### Invoice Generation

Invoices are created automatically when:
- User subscribes to a paid plan
- Subscription renews
- User upgrades to a more expensive plan

### Invoice Status

| Status | Description |
|--------|-------------|
| Pending | Awaiting payment |
| Paid | Payment completed |
| Cancelled | Invoice was cancelled |

### PDF Download

Users can download PDF invoices from:
- `/billing` page > Payment History > Download button
- Direct link: `/api/billing/invoices/{id}/pdf`

## Email Notifications

Configure email notifications in settings:

| Notification | When Sent |
|--------------|-----------|
| Invoice Created | New invoice generated |
| Payment Received | Payment completed successfully |
| Subscription Expiring | During grace period before suspension |

Email notifications require SMTP configuration in Admin > Settings > Email.

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/config` | Get billing configuration |
| GET | `/api/billing/plans` | List active plans |
| POST | `/api/billing/validate-coupon` | Validate a coupon code |

### User (authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/my/subscription` | Get current subscription |
| GET | `/api/billing/my/invoices` | List user invoices |
| GET | `/api/billing/my/payments` | List user payments |
| POST | `/api/billing/subscribe` | Subscribe to a plan |
| POST | `/api/billing/change-plan` | Preview plan change |
| POST | `/api/billing/change-plan/confirm` | Confirm plan change |
| POST | `/api/billing/cancel` | Cancel subscription |
| GET | `/api/billing/invoices/:id/pdf` | Download invoice PDF |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/admin/stats` | Billing statistics |
| GET/POST | `/api/billing/admin/plans` | Manage plans |
| PUT/DELETE | `/api/billing/admin/plans/:id` | Update/delete plan |
| GET/POST | `/api/billing/admin/coupons` | Manage coupons |
| PUT/DELETE | `/api/billing/admin/coupons/:id` | Update/delete coupon |
| GET | `/api/billing/admin/subscriptions` | List subscriptions |
| PUT | `/api/billing/admin/subscriptions/:id` | Update subscription |
| GET | `/api/billing/admin/invoices` | List invoices |
| PUT | `/api/billing/admin/invoices/:id` | Update invoice |
| GET | `/api/billing/admin/payments` | List payments |
| GET/PUT | `/api/billing/admin/settings` | Billing settings |

## Troubleshooting

### Stripe webhook not working

- Verify the webhook URL is correct and publicly accessible
- Check the webhook secret matches
- Ensure `checkout.session.completed` event is selected
- Check server logs for webhook errors

### PayPal payments not completing

- Verify Client ID and Secret are correct
- Check if Sandbox mode matches your PayPal app environment
- Ensure the PayPal app has the required permissions

### Subscription not activating

- Check if the invoice status is "paid"
- Verify the subscription status in Admin > Billing > Subscriptions
- Check server logs for errors during payment processing

### Servers not suspending

- Verify `autoSuspend` is enabled in settings
- Check that the billing scheduler is running (starts with the server)
- Review the grace period setting
