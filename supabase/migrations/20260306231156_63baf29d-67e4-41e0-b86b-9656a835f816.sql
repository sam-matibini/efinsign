
-- Fix infinite recursion (42P17) by scoping owner-only policies to authenticated role only.
-- This breaks the circular dependency: document_signers -> documents -> document_signers
-- that occurs when anonymous signers try to read document_signers.

-- 1. Scope "Document owners can manage signers" to authenticated only
ALTER POLICY "Document owners can manage signers" ON public.document_signers TO authenticated;

-- 2. Scope "Document owners can manage fields" to authenticated only
ALTER POLICY "Document owners can manage fields" ON public.document_fields TO authenticated;
