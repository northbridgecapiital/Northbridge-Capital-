import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const rawPublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || '';

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    !lower ||
    lower.includes('your_supabase') ||
    lower.includes('replace_me') ||
    lower.includes('example')
  );
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isServiceRoleJwt(key: string): boolean {
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

export const missingEnvVars: string[] = [];
if (isPlaceholder(rawUrl)) missingEnvVars.push('VITE_SUPABASE_URL');
if (isPlaceholder(rawPublishableKey)) missingEnvVars.push('VITE_SUPABASE_PUBLISHABLE_KEY');

let configError: string | null = null;
if (missingEnvVars.length > 0) {
  configError = `Missing required environment variable(s): ${missingEnvVars.join(
    ', '
  )}. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file or Netlify Environment Variables and rebuild.`;
} else if (!isValidHttpUrl(rawUrl)) {
  configError =
    'Invalid VITE_SUPABASE_URL format. Provide a valid https://<project-ref>.supabase.co URL.';
} else if (isServiceRoleJwt(rawPublishableKey)) {
  configError =
    'Configuration blocked: VITE_SUPABASE_PUBLISHABLE_KEY must be a public anon/publishable key, never a service_role secret key.';
}

export const supabaseUrl: string = rawUrl;
export const supabaseConfigError: string | null = configError;
export const isSupabaseConfigured: boolean = configError === null;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawPublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
