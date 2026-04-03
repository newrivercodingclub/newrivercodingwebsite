document.querySelectorAll("time").forEach((el) => {
  const startTime = new Date(el.getAttribute("time"))
  const now = new Date()

  // 1. Standard Date/Range Formatting
  const dateFormatter = new Intl.DateTimeFormat(navigator.language, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  let displayString = ""

  if (el.hasAttribute("endTime")) {
    const endTime = new Date(el.getAttribute("endTime"))
    displayString = dateFormatter.formatRange(startTime, endTime)

    // --- ADDING DURATION ---
    const diffMs = endTime - startTime
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    displayString += ` (${hours}h ${mins}m)`
  } else {
    displayString = dateFormatter.format(startTime)
  }

  // --- ADDING RELATIVE TIME (How long ago/until) ---
  const relativeFormatter = new Intl.RelativeTimeFormat(
    navigator.language,
    { numeric: "auto" },
  )

  const diffInSeconds = Math.floor((startTime - now) / 1000)
  const diffInDays = Math.floor(diffInSeconds / 86400)

  let relativeText = ""
  if (Math.abs(diffInDays) > 0) {
    relativeText = relativeFormatter.format(diffInDays, "day")
  } else {
    const diffInHours = Math.floor(diffInSeconds / 3600)
    relativeText = relativeFormatter.format(diffInHours, "hour")
  }

  el.textContent = `${displayString} - ${relativeText}`
})
