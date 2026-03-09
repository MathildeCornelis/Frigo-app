import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gjhvlqeuiizedsknvgql.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_GSZIheUjx2djRVUas6rzxw_LOmBdImP'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)