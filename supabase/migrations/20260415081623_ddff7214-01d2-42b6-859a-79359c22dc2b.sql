
-- Add montant_inscription to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS montant_inscription numeric DEFAULT 0;

-- Add photo to personnel (telephone already exists)
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS photo text;

-- Add poste and telephone to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS poste text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS telephone text;
