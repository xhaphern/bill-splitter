-- Add mobile number field for friends and enforce per-user uniqueness.
-- Existing rows keep phone NULL until backfilled; the partial unique index
-- ensures we can progressively roll out numbers without blocking older rows.

ALTER TABLE public.friends
ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.friends.phone IS
  'Normalized mobile number (digits only) used to identify friends per user.';

ALTER TABLE public.friends
ADD CONSTRAINT friends_phone_min_length CHECK (
  phone IS NULL OR phone ~ '^[0-9]{7,}$'
);

CREATE UNIQUE INDEX IF NOT EXISTS friends_user_phone_key
  ON public.friends (user_id, phone)
  WHERE phone IS NOT NULL;
