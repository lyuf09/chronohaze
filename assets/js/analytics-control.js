(function () {
  "use strict";

  var measurementId = "G-JWZY2TVYFZ";
  var preferenceKey = "chronohaze-analytics";
  var disableKey = "ga-disable-" + measurementId;
  var runtimeScript = document.currentScript;
  var collectionEnabled =
    !!runtimeScript && runtimeScript.getAttribute("data-analytics-collection") === "enabled";
  var storedPreference = null;

  if (
    window.__chronohazeAnalytics &&
    typeof window.__chronohazeAnalytics.refresh === "function"
  ) {
    window.__chronohazeAnalytics.refresh(collectionEnabled);
    return;
  }

  try {
    storedPreference = window.localStorage.getItem(preferenceKey);
  } catch (_err) {}

  var doNotTrack = navigator.doNotTrack === "1" || window.doNotTrack === "1";
  var analyticsEnabled =
    typeof window.__chronohazeAnalyticsInitialEnabled === "boolean"
      ? window.__chronohazeAnalyticsInitialEnabled
      : storedPreference === "on" || (storedPreference !== "off" && !doNotTrack);

  window[disableKey] = !analyticsEnabled;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };

  window.gtag("set", {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  window.gtag("consent", "default", {
    analytics_storage: analyticsEnabled ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  function deleteAnalyticsCookies() {
    var cookieNames = document.cookie
      .split(";")
      .map(function (part) {
        return part.split("=")[0].trim();
      })
      .filter(function (name) {
        return /^_ga(?:_|$)/.test(name) || name === "_gid" || /^_gat(?:_|$)/.test(name);
      });
    var hostname = window.location.hostname;

    cookieNames.forEach(function (name) {
      var base =
        name +
        "=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
      document.cookie = base;
      if (hostname) {
        document.cookie = base + "; domain=" + hostname;
        document.cookie = base + "; domain=." + hostname;
      }
    });
  }

  function updateControls() {
    document.querySelectorAll("[data-analytics-control]").forEach(function (control) {
      var status = control.querySelector("[data-analytics-status]");
      var button = control.querySelector("[data-analytics-toggle]");
      var statusText = analyticsEnabled ? "Analytics: On" : "Analytics: Off";
      var actionText = analyticsEnabled ? "Turn off" : "Turn on";

      if (status && status.textContent !== statusText) status.textContent = statusText;
      if (button && button.textContent !== actionText) button.textContent = actionText;
      if (button) button.setAttribute("aria-label", actionText + " Google Analytics");
      control.setAttribute("data-analytics-enabled", analyticsEnabled ? "true" : "false");
    });
  }

  function configureAnalytics() {
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 90 * 24 * 60 * 60,
    });
  }

  function loadAnalytics() {
    if (!collectionEnabled || !analyticsEnabled || loadAnalytics.loaded) return;
    loadAnalytics.loaded = true;
    var script = document.createElement("script");
    script.id = "chronohaze-google-tag";
    script.async = true;
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
    window.gtag("js", new Date());
    configureAnalytics();
  }

  function setAnalyticsEnabled(nextEnabled) {
    analyticsEnabled = !!nextEnabled;
    try {
      window.localStorage.setItem(preferenceKey, analyticsEnabled ? "on" : "off");
    } catch (_err) {}

    window[disableKey] = !analyticsEnabled;
    window.gtag("consent", "update", {
      analytics_storage: analyticsEnabled ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    if (analyticsEnabled) {
      if (loadAnalytics.loaded) configureAnalytics();
      else loadAnalytics();
    } else {
      deleteAnalyticsCookies();
    }

    updateControls();
    document.dispatchEvent(
      new CustomEvent("chronohaze:analytics-change", {
        detail: { enabled: analyticsEnabled },
      })
    );
  }

  function refreshForPageSwap(nextCollectionEnabled) {
    if (typeof nextCollectionEnabled === "boolean") {
      collectionEnabled = nextCollectionEnabled;
    } else {
      var shell = document.querySelector(
        ".analytics-control-shell[data-analytics-collection]"
      );
      collectionEnabled =
        !!shell && shell.getAttribute("data-analytics-collection") === "enabled";
    }
    updateControls();
    if (collectionEnabled && analyticsEnabled) {
      if (loadAnalytics.loaded) configureAnalytics();
      else loadAnalytics();
    }
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest("[data-analytics-toggle]");
    if (!button) return;
    event.preventDefault();
    setAnalyticsEnabled(!analyticsEnabled);
  });
  document.addEventListener("chronohaze:page-swapped", function () {
    refreshForPageSwap();
  });

  function initializeControls() {
    updateControls();
    if (window.MutationObserver && document.body) {
      var observer = new MutationObserver(updateControls);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  window.__chronohazeAnalytics = {
    isEnabled: function () {
      return analyticsEnabled;
    },
    setEnabled: setAnalyticsEnabled,
    load: loadAnalytics,
    refresh: refreshForPageSwap,
    measurementId: measurementId,
  };

  if (!analyticsEnabled) deleteAnalyticsCookies();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeControls, { once: true });
  } else {
    initializeControls();
  }

  if (collectionEnabled && analyticsEnabled) {
    if (document.readyState === "complete") {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadAnalytics, { timeout: 3500 });
      } else {
        window.setTimeout(loadAnalytics, 1800);
      }
    } else {
      window.addEventListener(
        "load",
        function () {
          if ("requestIdleCallback" in window) {
            window.requestIdleCallback(loadAnalytics, { timeout: 3500 });
          } else {
            window.setTimeout(loadAnalytics, 1800);
          }
        },
        { once: true }
      );
    }
  }
})();
