(function () {
  "use strict";

  var MEDIA_SELECTOR = "img, audio, video";

  function stopEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  function isMediaTarget(target) {
    if (!target || typeof target.closest !== "function") {
      return false;
    }
    return !!target.closest(MEDIA_SELECTOR);
  }

  function protectElement(element) {
    if (!element || element.dataset.mediaProtected === "1") {
      return;
    }

    element.dataset.mediaProtected = "1";

    if (element.tagName === "IMG") {
      element.setAttribute("draggable", "false");
      element.style.webkitUserDrag = "none";
      element.style.userSelect = "none";
      element.addEventListener("dragstart", stopEvent);
      element.addEventListener("contextmenu", stopEvent);
    }

    if (element.tagName === "AUDIO" || element.tagName === "VIDEO") {
      element.setAttribute(
        "controlslist",
        "nodownload noplaybackrate noremoteplayback"
      );
      element.setAttribute("disablepictureinpicture", "");
      element.setAttribute("oncontextmenu", "return false");
      element.addEventListener("contextmenu", stopEvent);
      element.addEventListener("dragstart", stopEvent);
    }
  }

  function protectAllMedia() {
    document.querySelectorAll(MEDIA_SELECTOR).forEach(protectElement);
  }

  document.addEventListener(
    "contextmenu",
    function (event) {
      if (isMediaTarget(event.target)) {
        stopEvent(event);
      }
    },
    true
  );

  document.addEventListener(
    "dragstart",
    function (event) {
      if (isMediaTarget(event.target)) {
        stopEvent(event);
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    function (event) {
      var key = (event.key || "").toLowerCase();
      var hasModifier = event.ctrlKey || event.metaKey;

      if (hasModifier && (key === "s" || key === "u")) {
        stopEvent(event);
        return;
      }

      if (hasModifier && event.shiftKey && (key === "i" || key === "j")) {
        stopEvent(event);
        return;
      }

      if (event.key === "F12") {
        stopEvent(event);
      }
    },
    true
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", protectAllMedia, {
      once: true,
    });
  } else {
    protectAllMedia();
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (!node || node.nodeType !== 1) {
          return;
        }

        if (typeof node.matches === "function" && node.matches(MEDIA_SELECTOR)) {
          protectElement(node);
        }

        if (typeof node.querySelectorAll === "function") {
          node.querySelectorAll(MEDIA_SELECTOR).forEach(protectElement);
        }
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
