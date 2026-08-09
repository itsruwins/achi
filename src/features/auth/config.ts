/**
 * Which sign-in methods are offered.
 *
 * Google is off until an OAuth client exists in Google Cloud Console and its
 * Client ID / Secret are saved in Supabase → Authentication → Providers →
 * Google. Rendering the button before then gives people a control that always
 * fails, which is worse than not offering it.
 *
 * To turn it on: set this to true. Nothing else in the app needs to change —
 * the action and callback route are already wired.
 */
export const GOOGLE_AUTH_ENABLED = false;
