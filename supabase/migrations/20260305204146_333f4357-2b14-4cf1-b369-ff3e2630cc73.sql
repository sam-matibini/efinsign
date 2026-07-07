
ALTER TABLE public.document_fields DROP CONSTRAINT IF EXISTS document_fields_field_type_check;
ALTER TABLE public.document_fields ADD CONSTRAINT document_fields_field_type_check 
  CHECK (field_type IN ('signature', 'initials', 'date', 'text', 'checkmark', 'full_name', 'title'));
