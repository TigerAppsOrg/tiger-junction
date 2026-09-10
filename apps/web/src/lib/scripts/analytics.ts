import posthog from "posthog-js";
import { browser } from "$app/environment";

// Write-only project token — PostHog documents these as safe to ship in
// public client bundles, which is where any PUBLIC_ env var would end up too.
const POSTHOG_TOKEN = "phc_mJkanhrtZD3kjNFcEmLQGbWYS9J7jcwepkyqM6f3h9XR";

let initialized = false;

/**
 * Initialize PostHog. No-op outside production browser builds so local
 * dev sessions don't pollute analytics. Safe to call repeatedly.
 */
export const initAnalytics = () => {
    if (!browser || !import.meta.env.PROD || initialized) return;
    posthog.init(POSTHOG_TOKEN, {
        api_host: "https://us.i.posthog.com",
        defaults: "2026-01-30",
        person_profiles: "identified_only"
    });
    initialized = true;
};

/**
 * Key the person by netid (the Princeton email prefix), matching how
 * PrincetonCourses identifies users so the two apps share person profiles.
 */
export const identifyUser = (email: string | null | undefined) => {
    if (!initialized || !email) return;
    const netid = email.split("@")[0].trim().toLowerCase();
    if (netid && posthog.get_distinct_id() !== netid) {
        posthog.identify(netid);
    }
};

/** Unlink the device from the person on sign-out. */
export const resetAnalytics = () => {
    if (!initialized) return;
    posthog.reset();
};
