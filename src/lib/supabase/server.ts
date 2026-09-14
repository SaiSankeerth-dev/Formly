import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export type CreateClientOptions = {
  cookieStore?: Awaited<ReturnType<typeof cookies>>;
  request?: Request;
  onSetCookies?: (cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) => void;
};

export async function createClient(
  customCookieStoreOrOptions?: Awaited<ReturnType<typeof cookies>> | CreateClientOptions
) {
  let cookieStore: any;
  let rawRequest: Request | undefined;
  let onSetCookies: ((cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) => void) | undefined;

  if (customCookieStoreOrOptions && "onSetCookies" in customCookieStoreOrOptions) {
    onSetCookies = customCookieStoreOrOptions.onSetCookies;
    rawRequest = customCookieStoreOrOptions.request;
    cookieStore = customCookieStoreOrOptions.cookieStore || (await cookies());
  } else if (customCookieStoreOrOptions && "request" in customCookieStoreOrOptions) {
    rawRequest = customCookieStoreOrOptions.request;
    cookieStore = customCookieStoreOrOptions.cookieStore || (await cookies());
  } else if (customCookieStoreOrOptions && typeof (customCookieStoreOrOptions as any).getAll === "function") {
    cookieStore = customCookieStoreOrOptions;
  } else {
    cookieStore = await cookies();
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://jvzvfpfzhmidsztfexsd.supabase.co";

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "sb_publishable_3asBWnzHlx_AKzwDFvWhWA_j5Zod3Yd";

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        const storeCookies = cookieStore?.getAll?.();
        if (storeCookies && Array.isArray(storeCookies) && storeCookies.length > 0) {
          return storeCookies;
        }
        if (rawRequest) {
          const cookieHeader = rawRequest.headers.get("cookie") || "";
          if (cookieHeader) {
            return cookieHeader
              .split(";")
              .map((c: string) => {
                const [rawName, ...rawVal] = c.trim().split("=");
                return { name: rawName, value: decodeURIComponent(rawVal.join("=")) };
              })
              .filter((c: any) => c.name);
          }
        }
        return [];
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

