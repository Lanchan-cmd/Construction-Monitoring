-- ============================================================================
-- NIRMAN: Seed 5 Engineers, 5 Contractors & 8 Assigned Construction Projects
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wnhvboimtawkykxctjlo/sql/new
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. SEED 5 ENGINEERS & 5 CONTRACTORS INTO auth.users
-- Password for all accounts: Nirman@2026
-- All emails are pre-confirmed (email_confirmed_at = now()) so login is immediate.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_admin_id uuid := 'bc83db14-c526-4e8f-a194-553e9f4744bf';
  v_hashed_pw text := crypt('Nirman@2026', gen_salt('bf'));
BEGIN

  -- 0. Clean up any existing records with these emails or IDs for clean, reproducible insertion
  DELETE FROM public.projects WHERE id IN (
    'b1111111-0001-4000-8000-000000000001',
    'b2222222-0002-4000-8000-000000000002',
    'b3333333-0003-4000-8000-000000000003',
    'b4444444-0004-4000-8000-000000000004',
    'b5555555-0005-4000-8000-000000000005',
    'b6666666-0006-4000-8000-000000000006',
    'b7777777-0007-4000-8000-000000000007',
    'b8888888-0008-4000-8000-000000000008',
    'b9999999-0009-4000-8000-000000000009',
    'baaaaaaa-0010-4000-8000-000000000010'
  );

  DELETE FROM public.profiles WHERE email IN (
    'engineer1@nirman.com', 'engineer2@nirman.com', 'engineer3@nirman.com', 'engineer4@nirman.com', 'engineer5@nirman.com',
    'contractor1@nirman.com', 'contractor2@nirman.com', 'contractor3@nirman.com', 'contractor4@nirman.com', 'contractor5@nirman.com'
  );

  DELETE FROM auth.users WHERE email IN (
    'engineer1@nirman.com', 'engineer2@nirman.com', 'engineer3@nirman.com', 'engineer4@nirman.com', 'engineer5@nirman.com',
    'contractor1@nirman.com', 'contractor2@nirman.com', 'contractor3@nirman.com', 'contractor4@nirman.com', 'contractor5@nirman.com'
  );

  -- 1.1 Engineer 1: Rajesh Kumar
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '11111111-1111-4111-a111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'engineer1@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rajesh Kumar","role":"engineer"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Rajesh Kumar","role":"engineer"}'::jsonb;

  -- 1.2 Engineer 2: Priya Sharma
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '22222222-2222-4222-a222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'engineer2@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Priya Sharma","role":"engineer"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Priya Sharma","role":"engineer"}'::jsonb;

  -- 1.3 Engineer 3: Karthik Gowda
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '33333333-3333-4333-a333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'engineer3@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Karthik Gowda","role":"engineer"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Karthik Gowda","role":"engineer"}'::jsonb;

  -- 1.4 Engineer 4: Ananya Rao
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '44444444-4444-4444-a444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'engineer4@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ananya Rao","role":"engineer"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Ananya Rao","role":"engineer"}'::jsonb;

  -- 1.5 Engineer 5: Vikram Patel
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '55555555-5555-4555-a555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'engineer5@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Vikram Patel","role":"engineer"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Vikram Patel","role":"engineer"}'::jsonb;

  -- 1.6 Contractor 1: Suresh Reddy (Reddy Builders)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '66666666-6666-4666-a666-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'contractor1@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Suresh Reddy (Reddy Builders)","role":"contractor"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Suresh Reddy (Reddy Builders)","role":"contractor"}'::jsonb;

  -- 1.7 Contractor 2: Manjunath K (Cauvery Infra)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '77777777-7777-4777-a777-777777777777',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'contractor2@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Manjunath K (Cauvery Infra)","role":"contractor"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Manjunath K (Cauvery Infra)","role":"contractor"}'::jsonb;

  -- 1.8 Contractor 3: Ramesh Patil (Patil Works)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '88888888-8888-4888-a888-888888888888',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'contractor3@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ramesh Patil (Patil Works)","role":"contractor"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Ramesh Patil (Patil Works)","role":"contractor"}'::jsonb;

  -- 1.9 Contractor 4: Venkatesh M (SLV Developers)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '99999999-9999-4999-a999-999999999999',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'contractor4@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Venkatesh M (SLV Developers)","role":"contractor"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Venkatesh M (SLV Developers)","role":"contractor"}'::jsonb;

  -- 1.10 Contractor 5: Deepak Hegde (Hegde Civil)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'contractor5@nirman.com', v_hashed_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Deepak Hegde (Hegde Civil)","role":"contractor"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = v_hashed_pw,
    email_confirmed_at = now(),
    raw_user_meta_data = '{"full_name":"Deepak Hegde (Hegde Civil)","role":"contractor"}'::jsonb;

  -- --------------------------------------------------------------------------
  -- 2. SEED PROFILES INTO public.profiles
  -- --------------------------------------------------------------------------

  INSERT INTO public.profiles (id, email, full_name, role, phone, preferred_language, is_active)
  VALUES
    ('11111111-1111-4111-a111-111111111111', 'engineer1@nirman.com', 'Rajesh Kumar', 'engineer', '+91 98451 10001', 'en', true),
    ('22222222-2222-4222-a222-222222222222', 'engineer2@nirman.com', 'Priya Sharma', 'engineer', '+91 98451 10002', 'en', true),
    ('33333333-3333-4333-a333-333333333333', 'engineer3@nirman.com', 'Karthik Gowda', 'engineer', '+91 98451 10003', 'en', true),
    ('44444444-4444-4444-a444-444444444444', 'engineer4@nirman.com', 'Ananya Rao', 'engineer', '+91 98451 10004', 'en', true),
    ('55555555-5555-4555-a555-555555555555', 'engineer5@nirman.com', 'Vikram Patel', 'engineer', '+91 98451 10005', 'en', true),
    ('66666666-6666-4666-a666-666666666666', 'contractor1@nirman.com', 'Suresh Reddy (Reddy Builders)', 'contractor', '+91 97412 20001', 'en', true),
    ('77777777-7777-4777-a777-777777777777', 'contractor2@nirman.com', 'Manjunath K (Cauvery Infra)', 'contractor', '+91 97412 20002', 'en', true),
    ('88888888-8888-4888-a888-888888888888', 'contractor3@nirman.com', 'Ramesh Patil (Patil Works)', 'contractor', '+91 97412 20003', 'en', true),
    ('99999999-9999-4999-a999-999999999999', 'contractor4@nirman.com', 'Venkatesh M (SLV Developers)', 'contractor', '+91 97412 20004', 'en', true),
    ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'contractor5@nirman.com', 'Deepak Hegde (Hegde Civil)', 'contractor', '+91 97412 20005', 'en', true)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;

  -- --------------------------------------------------------------------------
  -- 3. SEED 8 CONSTRUCTION PROJECTS WITH ASSIGNED ENGINEERS & CONTRACTORS
  -- --------------------------------------------------------------------------

  -- Project 1: Greenfield Residential Towers
  -- Assigned: Engineer Rajesh Kumar (1) & Contractor Suresh Reddy (1)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'b1111111-0001-4000-8000-000000000001',
    'Greenfield Residential Towers',
    'Construction of twin 14-story residential towers with modern amenities and basement parking.',
    v_admin_id,
    '11111111-1111-4111-a111-111111111111', -- Engineer 1 (Rajesh Kumar)
    '66666666-6666-4666-a666-666666666666', -- Contractor 1 (Suresh Reddy)
    'active', 65000000.00, 22750000.00, 35, 18.00,
    '2026-01-15', '2027-06-30', 'Karnataka', 'Bangalore Urban', 'Bangalore South', 'Kengeri', '560060'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

  -- Project 2: Metro Line 4 Elevated Corridor
  -- Assigned: Engineer Priya Sharma (2) & Contractor Suresh Reddy (1)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'b2222222-0002-4000-8000-000000000002',
    'Metro Line 4 Elevated Corridor',
    'Civil works for 4.2 km elevated viaduct, pier construction, and 3 elevated passenger stations.',
    v_admin_id,
    '22222222-2222-4222-a222-222222222222', -- Engineer 2 (Priya Sharma)
    '66666666-6666-4666-a666-666666666666', -- Contractor 1 (Suresh Reddy)
    'active', 182000000.00, 109200000.00, 60, 18.00,
    '2025-08-01', '2027-03-31', 'Karnataka', 'Bangalore Urban', 'Bangalore East', 'KR Puram', '560036'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

  -- Project 3: Cauvery Commercial Hub
  -- Assigned: Engineer Priya Sharma (2) & Contractor Manjunath K (2)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'b3333333-0003-4000-8000-000000000003',
    'Cauvery Commercial Hub',
    'G+6 commercial complex featuring retail spaces, multiplex, and centralized air conditioning.',
    v_admin_id,
    '22222222-2222-4222-a222-222222222222', -- Engineer 2 (Priya Sharma)
    '77777777-7777-4777-a777-777777777777', -- Contractor 2 (Manjunath K)
    'active', 48000000.00, 9600000.00, 20, 18.00,
    '2026-03-01', '2027-10-15', 'Karnataka', 'Mysore', 'Mysore Taluk', 'Hebbal', '570016'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

  -- Project 4: Tech Park Phase 2 - Whitefield
  -- Assigned: Engineer Karthik Gowda (3) & Contractor Manjunath K (2)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'b4444444-0004-4000-8000-000000000004',
    'Tech Park Phase 2 - Whitefield',
    'Modern IT campus building with steel frame structure, facade glass work, and smart BMS integration.',
    v_admin_id,
    '33333333-3333-4333-a333-333333333333', -- Engineer 3 (Karthik Gowda)
    '77777777-7777-4777-a777-777777777777', -- Contractor 2 (Manjunath K)
    'active', 120000000.00, 90000000.00, 75, 18.00,
    '2025-05-10', '2026-12-31', 'Karnataka', 'Bangalore Urban', 'Bangalore East', 'Whitefield', '560066'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

  -- Project 5: NH-48 Highway Bypass & Flyover
  -- Assigned: Engineer Karthik Gowda (3) & Contractor Ramesh Patil (3)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'b5555555-0005-4000-8000-000000000005',
    'NH-48 Highway Bypass & Flyover',
    '4-lane highway expansion with 1.2 km flyover, concrete paving, and rainwater drainage culverts.',
    v_admin_id,
    '33333333-3333-4333-a333-333333333333', -- Engineer 3 (Karthik Gowda)
    '88888888-8888-4888-a888-888888888888', -- Contractor 3 (Ramesh Patil)
    'active', 245000000.00, 110250000.00, 45, 18.00,
    '2025-09-01', '2027-08-30', 'Karnataka', 'Tumkur', 'Tumkur Rural', 'Batawadi', '572101'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

  -- Project 6: Apex Multi-Specialty Hospital
  -- Assigned: Engineer Ananya Rao (4) & Contractor Ramesh Patil (3)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'b6666666-0006-4000-8000-000000000006',
    'Apex Multi-Specialty Hospital',
    '250-bed hospital facility with specialized operation theatre suites, oxygen plant, and emergency ramp.',
    v_admin_id,
    '44444444-4444-4444-a444-444444444444', -- Engineer 4 (Ananya Rao)
    '88888888-8888-4888-a888-888888888888', -- Contractor 3 (Ramesh Patil)
    'active', 93000000.00, 13950000.00, 15, 12.00,
    '2026-02-01', '2028-01-31', 'Karnataka', 'Dakshina Kannada', 'Mangalore', 'Kankanady', '575002'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

  -- Project 7: Smart City Water Pipeline & Drainage
  -- Assigned: Engineer Ananya Rao (4) & Contractor Venkatesh M (4)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'b7777777-0007-4000-8000-000000000007',
    'Smart City Water Pipeline & Drainage',
    'Installation of 12 km underground DI water pipeline network and storm drainage canals.',
    v_admin_id,
    '44444444-4444-4444-a444-444444444444', -- Engineer 4 (Ananya Rao)
    '99999999-9999-4999-a999-999999999999', -- Contractor 4 (Venkatesh M)
    'active', 56000000.00, 28000000.00, 50, 18.00,
    '2025-11-15', '2026-11-30', 'Karnataka', 'Dharwad', 'Hubli', 'Vidyanagar', '580021'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

  -- Project 8: Sunrise Luxury Villas - Devanahalli
  -- Assigned: Engineer Vikram Patel (5) & Contractor Venkatesh M (4)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'b8888888-0008-4000-8000-000000000008',
    'Sunrise Luxury Villas - Devanahalli',
    'Development of 36 eco-friendly luxury villas with solar power grid, clubhouse, and landscaped gardens.',
    v_admin_id,
    '55555555-5555-4555-a555-555555555555', -- Engineer 5 (Vikram Patel)
    '99999999-9999-4999-a999-999999999999', -- Contractor 4 (Venkatesh M)
    'active', 78000000.00, 31200000.00, 40, 18.00,
    '2025-10-01', '2027-04-30', 'Karnataka', 'Bangalore Rural', 'Devanahalli', 'Bidaluru', '562110'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

  -- Project 9: Belagavi Industrial Warehouse & Logistics Center
  -- Assigned: Engineer Vikram Patel (5) & Contractor Deepak Hegde (5)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'b9999999-0009-4000-8000-000000000009',
    'Belagavi Industrial Warehouse & Logistics Center',
    'Heavy-duty industrial PEB warehouse with 8 loading bays, automated dock levelers, and solar rooftop.',
    v_admin_id,
    '55555555-5555-4555-a555-555555555555', -- Engineer 5 (Vikram Patel)
    'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', -- Contractor 5 (Deepak Hegde)
    'active', 42000000.00, 10500000.00, 25, 18.00,
    '2026-01-10', '2027-01-15', 'Karnataka', 'Belagavi', 'Belagavi Taluk', 'Desur', '590014'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

  -- Project 10: Coastal Highway Embankment & Sea Wall
  -- Assigned: Engineer Rajesh Kumar (1) & Contractor Deepak Hegde (5)
  INSERT INTO public.projects (
    id, name, description, created_by, engineer_id, contractor_id,
    status, budget, budget_used, progress_percent, gst_percent,
    start_date, end_date, state, district, taluk, village, pin_code
  ) VALUES (
    'baaaaaaa-0010-4000-8000-000000000010',
    'Coastal Highway Embankment & Sea Wall',
    'Reinforced concrete sea wall armor and coastal road stabilization over 3.8 km shoreline.',
    v_admin_id,
    '11111111-1111-4111-a111-111111111111', -- Engineer 1 (Rajesh Kumar)
    'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', -- Contractor 5 (Deepak Hegde)
    'active', 85000000.00, 46750000.00, 55, 18.00,
    '2025-07-01', '2026-12-15', 'Karnataka', 'Udupi', 'Udupi Taluk', 'Malpe', '576108'
  ) ON CONFLICT (id) DO UPDATE SET
    engineer_id = EXCLUDED.engineer_id,
    contractor_id = EXCLUDED.contractor_id;

END $$;

