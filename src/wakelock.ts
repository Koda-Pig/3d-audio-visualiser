let wakeLock: null | WakeLockSentinel = null;

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.info("WakeLock initialised.");
  } catch (error) {
    console.error("Failed to activate screen wakeLock:", error);
  }
}

function handleVisibilityChange() {
  if (wakeLock === null) return;

  if (document.visibilityState === "visible") {
    requestWakeLock();
  } else {
    wakeLock
      .release()
      .then(() => console.info("Screen wakeLock released"))
      .catch((error) =>
        console.error("Failed to release screen wakeLock:", error)
      );
    wakeLock = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if ("wakeLock" in navigator) {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (document.visibilityState === "visible") {
      requestWakeLock();
    }
  }
});
