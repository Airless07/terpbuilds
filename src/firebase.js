import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://rsgfmqztzrxakhpynatq.supabase.co'
const supabaseKey = 'sb_publishable_hDz-dMaK3qs4cnFo9VTpXg_Y0dT6_o_'
export const supabase = createClient(supabaseUrl, supabaseKey)
