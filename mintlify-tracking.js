/**
 * Fillout Tracking Script for Mintlify Documentation
 *
 * This script tracks referral parameters, ad click IDs, and user journey
 * across the help center. It uses the same tracking logic as the main landing page.
 *
 * Tracked parameters:
 * - ref/via: Referral codes (first attribution)
 * - gclid: Google Ads click ID (first attribution)
 * - fbclid: Facebook click ID (first attribution)
 * - firstTouch: First page visited
 * - lastTouch: Current page
 * - firstTouchParams: URL parameters from first visit
 *
 * Also includes:
 * - Dub Analytics SDK for affiliate/referral tracking
 */

// ============================================================================
// Part 1: Load Dub Analytics Script
// ============================================================================
// This enables affiliate tracking via dub_id parameters and the try.fillout.com
// referral domain. It must load before the rest of the tracking logic.
(function () {
  "use strict";

  // Create and inject the Dub Analytics script
  const script = document.createElement("script");

  // Option 1: Use Dub CDN directly (recommended for Mintlify)
  script.src = "https://www.dubcdn.com/analytics/script.js";

  // Option 2: Use reverse proxy (if you set one up on your Mintlify domain)
  // This helps avoid ad blockers, similar to your main landing page setup
  // script.src = '/_proxy/dub/script.js'; // Uncomment if using reverse proxy
  // script.setAttribute('data-api-host', '/_proxy/dub'); // Uncomment if using reverse proxy

  script.defer = true;

  // Configure Dub Analytics
  // - refer: Your Dub short domain for referral tracking (client-side click tracking)
  // - This enables tracking clicks via try.fillout.com/* links
  script.setAttribute(
    "data-domains",
    JSON.stringify({ refer: "try.fillout.com" })
  );

  // Track both 'via' and 'ref' query parameters
  script.setAttribute("data-query-params", JSON.stringify(["via", "ref"]));

  // Set cookie options for cross-domain tracking
  // This ensures the dub_id cookie is shared across *.fillout.com domains
  script.setAttribute(
    "data-cookie-options",
    JSON.stringify({
      domain: ".fillout.com",
      expiresInDays: 90, // Dub's default attribution window
    })
  );

  // Append to head
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  console.log("[Fillout Tracking] Dub Analytics script loaded");
})();

// ============================================================================
// Part 2: Custom Tracking Logic (Original Implementation)
// ============================================================================
// This tracks additional parameters and user journey across the help center
(function () {
  "use strict";

  // Configuration - matches main landing page
  const COOKIE_DOMAIN = ".fillout.com"; // Set to your domain (e.g., '.fillout.com' or 'help.fillout.com')
  const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

  // Cookie names - obfuscated to avoid ad blockers (same as landing page)
  const REFERRAL_COOKIE_NAME = "AFFILIATE_REFERRAL";
  const GCLID_COOKIE_NAME = "GOOGADSSOURCE_ID";
  const METADATA_COOKIE_NAME = "MISCMETA";

  // ============================================================================
  // Cookie Utilities
  // ============================================================================

  /**
   * Get a cookie value by name
   */
  function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(";");

    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];
      while (cookie.charAt(0) === " ") {
        cookie = cookie.substring(1, cookie.length);
      }
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(
          cookie.substring(nameEQ.length, cookie.length)
        );
      }
    }
    return null;
  }

  /**
   * Set a cookie with domain and expiration
   */
  function setCookie(name, value, options) {
    options = options || {};

    let cookieString = name + "=" + encodeURIComponent(value);

    // Set domain if provided
    if (options.domain) {
      cookieString += "; domain=" + options.domain;
    }

    // Set max-age (defaults to 1 year)
    const maxAge =
      options.maxAge !== undefined ? options.maxAge : COOKIE_MAX_AGE;
    cookieString += "; max-age=" + maxAge;

    // Set path (defaults to root)
    cookieString += "; path=/";

    // Set secure and SameSite for modern browsers
    if (window.location.protocol === "https:") {
      cookieString += "; secure";
    }
    cookieString += "; SameSite=Lax";

    document.cookie = cookieString;
  }

  // ============================================================================
  // URL Parameter Utilities
  // ============================================================================

  /**
   * Get URL parameters from current page
   */
  function getUrlParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);

    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  }

  /**
   * Get current pathname
   */
  function getCurrentPath() {
    return (
      window.location.pathname + window.location.search + window.location.hash
    );
  }

  // ============================================================================
  // Tracking Functions
  // ============================================================================

  /**
   * Track referral parameter (ref or via)
   * Uses first attribution model - only captures the first value
   */
  function trackReferral(params) {
    const ref = params.ref || params.via;

    if (ref) {
      const existingRef = getCookie(REFERRAL_COOKIE_NAME);

      // Only set if there's no existing referral (first attribution)
      if (!existingRef) {
        setCookie(REFERRAL_COOKIE_NAME, ref, { domain: COOKIE_DOMAIN });
        console.log("[Fillout Tracking] Referral tracked:", ref);
      }
    }
  }

  /**
   * Track Google Ads click ID
   * Uses first attribution model - only captures the first value
   */
  function trackGclid(params) {
    const gclid = params.gclid;

    if (gclid) {
      const existingGclid = getCookie(GCLID_COOKIE_NAME);

      // Only set if there's no existing gclid (first attribution)
      if (!existingGclid) {
        setCookie(GCLID_COOKIE_NAME, gclid, { domain: COOKIE_DOMAIN });
        console.log("[Fillout Tracking] Google Ads click tracked:", gclid);
      }
    }
  }

  /**
   * Track metadata including fbclid and user journey
   * Tracks first touch, last touch, and parameters
   */
  function trackMetadata(params) {
    const currentPath = getCurrentPath();
    const searchParams = window.location.search;

    // Get existing metadata
    let metadata = {};
    const existingMetadata = getCookie(METADATA_COOKIE_NAME);

    if (existingMetadata) {
      try {
        metadata = JSON.parse(existingMetadata);
      } catch (error) {
        console.error("[Fillout Tracking] Error parsing metadata:", error);
        metadata = {};
      }
    }

    // Ensure metadata is an object
    if (!metadata || typeof metadata !== "object") {
      metadata = {};
    }

    // Track Facebook click ID (first attribution)
    if (params.fbclid && typeof params.fbclid === "string") {
      if (!metadata.fbclid) {
        metadata.fbclid = params.fbclid;
      }
    }

    // Track Dub analytics ID (from affiliate system)
    if (params.dubId && typeof params.dubId === "string") {
      if (!metadata.dubId) {
        metadata.dubId = params.dubId;
      }
    }

    // Always update last touch
    metadata.lastTouch = currentPath;

    // Set first touch if not set
    if (metadata.firstTouch === undefined) {
      metadata.firstTouch = currentPath;
    }

    // Set first touch params if not set
    if (metadata.firstTouchParams === undefined) {
      metadata.firstTouchParams = searchParams;
    }

    // Save metadata
    const metadataStr = JSON.stringify(metadata);
    setCookie(METADATA_COOKIE_NAME, metadataStr, { domain: COOKIE_DOMAIN });
  }

  /**
   * Main tracking function - runs on every page load
   */
  function initTracking() {
    try {
      const params = getUrlParams();

      // Track different parameters
      trackReferral(params);
      trackGclid(params);
      trackMetadata(params);

      console.log("[Fillout Tracking] Tracking initialized");
    } catch (error) {
      console.error("[Fillout Tracking] Error initializing tracking:", error);
    }
  }

  // ============================================================================
  // Initialize on page load
  // ============================================================================

  // Run immediately if DOM is ready, otherwise wait
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTracking);
  } else {
    initTracking();
  }

  // Also track on hash changes (for single-page navigation)
  window.addEventListener("hashchange", function () {
    const params = getUrlParams();
    trackMetadata(params); // Update last touch
  });

  // For Mintlify's page navigation, listen to custom events or use MutationObserver
  // Mintlify may use client-side routing, so we need to detect page changes
  let lastPath = getCurrentPath();

  // Check for path changes periodically (for client-side routing)
  setInterval(function () {
    const currentPath = getCurrentPath();
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      const params = getUrlParams();
      trackMetadata(params); // Update last touch
      console.log("[Fillout Tracking] Page changed, updated tracking");
    }
  }, 500);
})();
