-- CRM Schema for SwiftQuote Property Measurement Application
-- Run: from `frontend/` → `npm run db:crm` (uses POSTGRES_URL in repo root `.env`).
-- Or paste into Neon / Vercel Postgres SQL editor, or use `psql`.

-- Authentication table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client management
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Property tracking
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  property_type VARCHAR(50) DEFAULT 'residential',
  lot_size_sqft INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead pipeline stages
CREATE TABLE IF NOT EXISTS lead_stages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead management
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  stage_id INTEGER NOT NULL REFERENCES lead_stages(id),
  source VARCHAR(100),
  estimated_value DECIMAL(10,2),
  probability INTEGER DEFAULT 50,
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project/measurement sessions
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, in_progress, completed, quoted
  total_area_sqft DECIMAL(12,2),
  polygon_data JSONB, -- Store measurement polygons
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quote generation
CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  price_per_sqft DECIMAL(8,2),
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
  valid_until DATE,
  quote_data JSONB, -- Store detailed quote breakdown
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity tracking for CRM
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  activity_type VARCHAR(100) NOT NULL, -- email, call, meeting, quote_sent, etc.
  description TEXT NOT NULL,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Research insights for market intelligence
CREATE TABLE IF NOT EXISTS research_insights (
  id SERIAL PRIMARY KEY,
  source VARCHAR(100) NOT NULL, -- 'reddit', 'forum', 'survey', etc.
  category VARCHAR(100), -- 'pricing', 'workflow', 'pain_points', etc.
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  url VARCHAR(500),
  sentiment VARCHAR(50), -- 'positive', 'negative', 'neutral'
  relevance_score INTEGER DEFAULT 5, -- 1-10 scale
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes following existing patterns
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts (user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_contact_id ON properties (contact_id);
CREATE INDEX IF NOT EXISTS idx_properties_lat_lng ON properties (lat, lng);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads (user_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads (stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_property_id ON projects (property_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes (user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON quotes (project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities (user_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON activities (activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_research_insights_category ON research_insights (category);
CREATE INDEX IF NOT EXISTS idx_research_insights_created_at ON research_insights (created_at DESC);

-- Insert default lead stages
INSERT INTO lead_stages (name, sort_order) VALUES
  ('New Lead', 1),
  ('Qualified', 2),
  ('Quoted', 3),
  ('Negotiating', 4),
  ('Won', 5),
  ('Lost', 6)
ON CONFLICT DO NOTHING;