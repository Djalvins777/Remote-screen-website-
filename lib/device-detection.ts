export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

  // Check for mobile devices
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  const isMobile = mobileRegex.test(userAgent)

  // Check for touch support
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0

  // Check screen size
  const isSmallScreen = window.innerWidth <= 768

  return isMobile || (hasTouch && isSmallScreen)
}

export function getBrowserInfo() {
  if (typeof window === "undefined") {
    return { name: "Unknown", supportsScreenShare: false }
  }

  const userAgent = navigator.userAgent
  let browserName = "Unknown"
  let supportsScreenShare = false

  // Detect browser
  if (userAgent.indexOf("Firefox") > -1) {
    browserName = "Firefox"
    supportsScreenShare = !isMobileDevice()
  } else if (userAgent.indexOf("Edg") > -1) {
    browserName = "Edge"
    supportsScreenShare = !isMobileDevice()
  } else if (userAgent.indexOf("Chrome") > -1) {
    browserName = "Chrome"
    supportsScreenShare = !isMobileDevice()
  } else if (userAgent.indexOf("Safari") > -1) {
    browserName = "Safari"
    supportsScreenShare = !isMobileDevice()
  }

  // Check if getDisplayMedia is actually available
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    supportsScreenShare = supportsScreenShare && !isMobileDevice()
  } else {
    supportsScreenShare = false
  }

  return { name: browserName, supportsScreenShare }
}
