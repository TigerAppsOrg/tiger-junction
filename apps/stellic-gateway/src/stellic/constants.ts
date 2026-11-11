// Endpoints and fixed request payloads, copied from the captured Stellic login.

export const STELLIC_URL = "https://stellic.princeton.edu/";
export const CAS_HOST = "fed.princeton.edu";
export const DUO_HOST_SUFFIX = "duosecurity.com";

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

// Browser capabilities Duo's prompt API expects; sent verbatim as the web app does.
export const BROWSER_FEATURES = JSON.stringify({
  touch_supported: false,
  platform_authenticator_status: "unavailable",
  webauthn_supported: false,
  screen_resolution_height: 0,
  screen_resolution_width: 0,
  screen_color_depth: 0,
});

// Compact JSON, exactly as the dashboard's XHR sends it, asking only for the
// "Semester Summary" card. Its content lists the current term's enrolled courses.
export const SEMESTER_SUMMARY_WIDGETS = JSON.stringify([
  {
    id: "planner:get_semester_summary",
    widget_type: "card",
    title: "Semester Summary",
    endpoint: "planner:get_semester_summary",
  },
]);

export function stellicUrl(path: string): string {
  return new URL(path, STELLIC_URL).toString();
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
