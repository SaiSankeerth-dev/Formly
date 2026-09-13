import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export type CreateClientOptions = {
  cookieStore?: Awaited<ReturnType<typeof cookies>>;
  onSetCookies?: (cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) => void;
};

export async function createClient(
  customCookieStoreOrOptions?: Awaited<ReturnType<typeof cookies>> | CreateClientOptions
) {
  let cookieStore: any;
  let onSetCookies: ((cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) => void) | undefined;

  if (customCookieStoreOrOptions && "onSetCookies" in customCookieStoreOrOptions) {
    onSetCookies = customCookieStoreOrOptions.onSetCookies;
    cookieStore = customCookieStoreOrOptions.cookieStore || (await cookies());
  } else if (customCookieStoreOrOptions && typeof (customCookieStoreOrOptions as any).getAll === "function") {
    cookieStore = customCookieStoreOrOptions;
  } else {
    cookieStore = await cookies();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        if (onSetCookies) {
          onSetCookies(cookiesToSet);
        }
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              path: "/",
            });
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

