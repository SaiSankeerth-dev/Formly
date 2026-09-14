import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://jvzvfpfzhmidsztfexsd.supabase.co";

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_3asBWnzHlx_AKzwDFvWhWA_j5Zod3Yd";

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
);
