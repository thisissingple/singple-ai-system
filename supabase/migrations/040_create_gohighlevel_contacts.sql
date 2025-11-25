-- Migration 037: Create GoHighLevel Contacts Table
-- Description: Store contacts received from GoHighLevel webhook
-- Created: 2025-10-23

-- Create gohighlevel_contacts table
CREATE TABLE IF NOT EXISTS gohighlevel_contacts (
  id BIGSERIAL PRIMARY KEY,

  -- GoHighLevel Contact ID (unique identifier)
  contact_id VARCHAR(255) UNIQUE NOT NULL,

  -- Basic Information
  name VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Additional Fields
  tags TEXT[], -- Array of tags
  source VARCHAR(255), -- Lead source
  location_id VARCHAR(255), -- GoHighLevel location ID
  company_name VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),

  -- Custom Fields (flexible JSON storage)
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Raw webhook data (for debugging)
  raw_data JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE,

  -- Indexing
  CONSTRAINT gohighlevel_contacts_contact_id_key UNIQUE (contact_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_gohighlevel_contacts_email ON gohighlevel_contacts(email);
CREATE INDEX idx_gohighlevel_contacts_phone ON gohighlevel_contacts(phone);
CREATE INDEX idx_gohighlevel_contacts_created_at ON gohighlevel_contacts(created_at DESC);
CREATE INDEX idx_gohighlevel_contacts_tags ON gohighlevel_contacts USING GIN(tags);
CREATE INDEX idx_gohighlevel_contacts_custom_fields ON gohighlevel_contacts USING GIN(custom_fields);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_gohighlevel_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gohighlevel_contacts_updated_at
  BEFORE UPDATE ON gohighlevel_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_gohighlevel_contacts_updated_at();

-- Add comment
COMMENT ON TABLE gohighlevel_contacts IS 'Stores contact data received from GoHighLevel webhook';
