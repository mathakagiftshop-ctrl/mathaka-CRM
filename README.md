# Mathaka Gift Store - CRM & Invoicing System

A complete CRM and invoicing system for Mathaka Gift Store, designed for managing customers abroad who send gifts to their loved ones in Sri Lanka.

## Features

- **Customer Management**: Track customers with WhatsApp numbers, country, and notes
- **Recipient Tracking**: Store recipient details (gift receivers in Sri Lanka)
- **Important Dates**: Track birthdays, anniversaries for automated reminders
- **Invoice Generation**: Create professional invoices with your logo
- **Receipt Generation**: Auto-generate receipts when payments are confirmed
- **Vendor Management**: Track suppliers for each order
- **WhatsApp Integration**: One-click WhatsApp messaging with pre-filled templates
- **Multi-user Support**: Admin and Staff roles
- **Mobile Responsive**: Works great on phones

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the SQL from `backend/supabase-schema.sql`
4. Go to **Settings > API** and copy:
   - Project URL
   - Service Role Key (under "Project API keys")

### 2. Configure Environment

```bash
cd mathaka-crm/backend
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
PORT=3001
JWT_SECRET=your-secret-key-change-this
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Install Dependencies

```bash
cd mathaka-crm
npm install
```

### 4. Seed Default Users

```bash
cd backend
npm run seed
```

### 5. Start Development

```bash
# From mathaka-crm folder
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173).

### 6. Login

Open http://localhost:5173

Default credentials:
- **Admin**: username=`admin`, password=`admin123`
- **Staff**: username=`staff`, password=`staff123`

⚠️ Change these passwords after first login!

## Configuration

### Upload Your Logo

1. Login as admin
2. Go to Settings
3. Upload your PNG logo

### Bank Details

Configure your bank details in Settings - they'll appear on all invoices.

## Invoice Flow

1. Customer contacts you (via Meta ads)
2. Create customer in CRM
3. Add recipient details (who receives the gift)
4. Create invoice → Send via WhatsApp
5. Customer pays via bank transfer
6. Mark invoice as paid → Receipt auto-generated
7. Download receipt → Send to customer

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **PDF**: PDFKit for invoice/receipt generation

## Deployment

### Deploy Backend (Railway/Render)

1. Push code to GitHub
2. Connect to Railway or Render
3. Set environment variables:
   - `PORT`
   - `JWT_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`

### Deploy Frontend (Vercel/Netlify)

1. Build: `npm run build` in frontend folder
2. Deploy the `dist` folder
3. Set API URL to your backend

## Support

Built for Mathaka Gift Store 🎁
