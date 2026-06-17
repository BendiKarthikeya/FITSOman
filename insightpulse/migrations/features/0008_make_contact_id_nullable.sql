-- Make contact_id nullable in crm_contact_tags to support phone-only associations
ALTER TABLE crm_contact_tags 
  ALTER COLUMN contact_id DROP NOT NULL;
