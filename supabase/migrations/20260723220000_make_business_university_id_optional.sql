-- Migration: Make university_id optional on businesses table for flexible CRM onboarding
ALTER TABLE public.businesses ALTER COLUMN university_id DROP NOT NULL;
