-- ═══════════════════════════════════════════════════════════════════
-- VYAPAI CRM — Supabase PostgreSQL Schema
-- Sudarshan AI Labs | vyapai.in
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. ORGANIZATIONS (Multi-tenant workspaces)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  org_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name      TEXT NOT NULL,
  industry      TEXT DEFAULT 'Retail',
  city          TEXT,
  state         TEXT DEFAULT 'Uttar Pradesh',
  gstin         TEXT,
  phone         TEXT,
  email         TEXT,
  plan          TEXT DEFAULT 'Free' CHECK (plan IN ('Free','Pro','Enterprise')),
  logo_url      TEXT,
  currency      TEXT DEFAULT 'INR',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. USERS & ROLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
  auth_user_id      UUID UNIQUE,  -- Supabase auth.users reference
  name              TEXT NOT NULL,
  email             TEXT UNIQUE,
  phone             TEXT,
  role              TEXT DEFAULT 'Staff' CHECK (role IN ('Owner','Staff')),
  lang_pref         TEXT DEFAULT 'Hinglish' CHECK (lang_pref IN ('Hindi','Hinglish','English')),
  avatar_url        TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. CUSTOMERS (Grahak)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  customer_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  business_name   TEXT NOT NULL,
  owner_name      TEXT,
  phone           TEXT,
  whatsapp        TEXT,
  email           TEXT,
  city            TEXT,
  locality        TEXT,
  state           TEXT DEFAULT 'Uttar Pradesh',
  category        TEXT DEFAULT 'Kirana'
                  CHECK (category IN ('Kirana','Retail','Distributor','Service','Manufacturer','Other')),
  gstin           TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES users(user_id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. LEADS / PIPELINE (Lead)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  lead_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES customers(customer_id),
  lead_name           TEXT NOT NULL,
  deal_title          TEXT,
  source              TEXT DEFAULT 'Walk-in'
                      CHECK (source IN ('Walk-in','WhatsApp','Referral','Ads','Call','Other')),
  stage               TEXT DEFAULT 'New'
                      CHECK (stage IN ('New','Follow-up','Negotiation','Won','Lost')),
  value_estimate      NUMERIC(12,2) DEFAULT 0,
  owner_user_id       UUID REFERENCES users(user_id),
  next_followup_date  DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 5. TASKS / FOLLOW-UPS (Kaam)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  task_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES customers(customer_id),
  lead_id             UUID REFERENCES leads(lead_id),
  title               TEXT NOT NULL,
  due_date            TIMESTAMPTZ,
  status              TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Done','Cancelled')),
  priority            TEXT DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  assigned_to         UUID REFERENCES users(user_id),
  notes               TEXT,
  created_by          UUID REFERENCES users(user_id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 6. ACTIVITY LOG
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  activity_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES customers(customer_id),
  lead_id             UUID REFERENCES leads(lead_id),
  type                TEXT DEFAULT 'Note'
                      CHECK (type IN ('Call','WhatsApp','Visit','Note','Email','Meeting')),
  summary             TEXT NOT NULL,
  created_by          UUID REFERENCES users(user_id),
  occurred_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 7. PRODUCTS / SERVICES (Vastu)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  product_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  name_hindi    TEXT,
  description   TEXT,
  hsn_sac       TEXT,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit          TEXT DEFAULT 'pcs',
  gst_rate      NUMERIC(5,2) DEFAULT 18
                CHECK (gst_rate IN (0,5,12,18,28)),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 8. INVOICES (Bill)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(customer_id),
  invoice_number  TEXT NOT NULL,
  date            DATE DEFAULT CURRENT_DATE,
  due_date        DATE,
  status          TEXT DEFAULT 'Draft'
                  CHECK (status IN ('Draft','Sent','Partially Paid','Paid','Overdue','Cancelled')),
  subtotal        NUMERIC(12,2) DEFAULT 0,
  discount_amt    NUMERIC(12,2) DEFAULT 0,
  cgst_amount     NUMERIC(12,2) DEFAULT 0,
  sgst_amount     NUMERIC(12,2) DEFAULT 0,
  igst_amount     NUMERIC(12,2) DEFAULT 0,
  total_amount    NUMERIC(12,2) DEFAULT 0,
  paid_amount     NUMERIC(12,2) DEFAULT 0,
  notes           TEXT,
  whatsapp_link   TEXT,
  created_by      UUID REFERENCES users(user_id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
  item_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(product_id),
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,3) DEFAULT 1,
  unit_price      NUMERIC(12,2) DEFAULT 0,
  discount_pct    NUMERIC(5,2) DEFAULT 0,
  line_total      NUMERIC(12,2) DEFAULT 0,
  hsn_sac         TEXT,
  gst_rate        NUMERIC(5,2) DEFAULT 18
);

-- ─────────────────────────────────────────────
-- 9. PAYMENTS (Bhugtan)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  payment_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  date            DATE DEFAULT CURRENT_DATE,
  amount          NUMERIC(12,2) NOT NULL,
  payment_mode    TEXT DEFAULT 'UPI'
                  CHECK (payment_mode IN ('Cash','UPI','Bank Transfer','Card','Cheque','Other')),
  reference_no    TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES users(user_id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 10. EXPENSES (Kharch)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  expense_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  date            DATE DEFAULT CURRENT_DATE,
  amount          NUMERIC(12,2) NOT NULL,
  category        TEXT DEFAULT 'Other'
                  CHECK (category IN ('Kiraya','Tankhwa','Marketing','Bijli-Pani','Transport','Kharida','Other')),
  vendor          TEXT,
  notes           TEXT,
  receipt_url     TEXT,
  gstin_vendor    TEXT,
  created_by      UUID REFERENCES users(user_id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 11. AI INSIGHTS LOG
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_insights (
  insight_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  type            TEXT DEFAULT 'action_point'
                  CHECK (type IN ('action_point','voice_insight','chat_response','alert')),
  content         TEXT NOT NULL,
  content_hindi   TEXT,
  metadata        JSONB,
  generated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — Multi-tenant
-- ═══════════════════════════════════════════
ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights   ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see rows belonging to their org
-- (Apply to each table — shown for customers as example)
CREATE POLICY "org_isolation_customers" ON customers
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "org_isolation_invoices" ON invoices
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "org_isolation_payments" ON payments
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "org_isolation_expenses" ON expenses
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "org_isolation_leads" ON leads
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "org_isolation_tasks" ON tasks
  FOR ALL USING (
    org_id = (SELECT org_id FROM users WHERE auth_user_id = auth.uid())
  );

-- ═══════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update invoice paid_amount when payment added
CREATE OR REPLACE FUNCTION update_invoice_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET
    paid_amount = (SELECT COALESCE(SUM(amount),0) FROM payments WHERE invoice_id = NEW.invoice_id),
    status = CASE
      WHEN (SELECT COALESCE(SUM(amount),0) FROM payments WHERE invoice_id = NEW.invoice_id) >= total_amount THEN 'Paid'
      WHEN (SELECT COALESCE(SUM(amount),0) FROM payments WHERE invoice_id = NEW.invoice_id) > 0 THEN 'Partially Paid'
      ELSE status
    END
  WHERE invoice_id = NEW.invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_inserted
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_paid();

-- ═══════════════════════════════════════════
-- VIEWS — for quick reporting
-- ═══════════════════════════════════════════

-- Receivables Aging View
CREATE OR REPLACE VIEW receivables_aging AS
SELECT
  c.business_name,
  i.invoice_number,
  i.total_amount,
  i.paid_amount,
  (i.total_amount - i.paid_amount) AS balance_due,
  i.due_date,
  (CURRENT_DATE - i.due_date) AS days_overdue,
  CASE
    WHEN (CURRENT_DATE - i.due_date) <= 0  THEN '0-Not Due'
    WHEN (CURRENT_DATE - i.due_date) <= 7  THEN '1-7 Din'
    WHEN (CURRENT_DATE - i.due_date) <= 30 THEN '8-30 Din'
    WHEN (CURRENT_DATE - i.due_date) <= 60 THEN '31-60 Din'
    ELSE '60+ Din'
  END AS aging_bucket
FROM invoices i
JOIN customers c ON i.customer_id = c.customer_id
WHERE i.status NOT IN ('Paid','Cancelled')
ORDER BY days_overdue DESC;

-- Monthly Sales View
CREATE OR REPLACE VIEW monthly_sales AS
SELECT
  DATE_TRUNC('month', date) AS month,
  COUNT(*) AS invoice_count,
  SUM(total_amount) AS total_sales,
  SUM(paid_amount) AS total_collected
FROM invoices
WHERE status NOT IN ('Draft','Cancelled')
GROUP BY 1
ORDER BY 1 DESC;

-- ═══════════════════════════════════════════
-- SEED DATA (Demo / Testing)
-- ═══════════════════════════════════════════

INSERT INTO organizations (org_id, org_name, industry, city, state, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sudarshan Traders', 'Retail', 'Lucknow', 'Uttar Pradesh', 'Pro')
ON CONFLICT DO NOTHING;

INSERT INTO customers (org_id, business_name, owner_name, phone, city, category)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Gupta General Store', 'Ramesh Gupta', '9876543210', 'Lucknow', 'Kirana'),
  ('00000000-0000-0000-0000-000000000001', 'Sharma Electronics', 'Vivek Sharma', '9876543211', 'Lucknow', 'Retail'),
  ('00000000-0000-0000-0000-000000000001', 'Mohan Distributors', 'Mohan Lal', '9876543212', 'Kanpur', 'Distributor'),
  ('00000000-0000-0000-0000-000000000001', 'Sunita Medical', 'Sunita Devi', '9876543213', 'Lucknow', 'Service'),
  ('00000000-0000-0000-0000-000000000001', 'Priya Saree House', 'Priya Singh', '9876543214', 'Lucknow', 'Retail')
ON CONFLICT DO NOTHING;
