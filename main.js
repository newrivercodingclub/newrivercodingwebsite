const updateTimes = () => {
  const now = new Date()
  let nextUpdateDelay = 3600000 // Default to 1 hour

  document.querySelectorAll("time").forEach((el) => {
    const startTime = new Date(el.getAttribute("time"))
    const endTimeAttr = el.getAttribute("endTime")

    const dateFormatter = new Intl.DateTimeFormat(
      navigator.language,
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
    )

    const getTwoUnits = (ms) => {
      const totalSecs = Math.floor(Math.abs(ms) / 1000)
      const d = Math.floor(totalSecs / 86400)
      const h = Math.floor((totalSecs % 86400) / 3600)
      const m = Math.floor((totalSecs % 3600) / 60)
      const s = totalSecs % 60

      if (d > 0)
        return { text: `${d}d${h > 0 ? ` ${h}h` : ""}`, unit: "day" }
      if (h > 0)
        return { text: `${h}h${m > 0 ? ` ${m}m` : ""}`, unit: "hour" }
      return { text: `${m}m${s > 0 ? ` ${s}s` : ""}`, unit: "minute" }
    }

    // 1. Main Display
    let displayString = ""
    if (endTimeAttr) {
      const endTime = new Date(endTimeAttr)
      displayString = dateFormatter.formatRange(startTime, endTime)
      displayString += ` (${getTwoUnits(endTime - startTime).text})`
    } else {
      displayString = dateFormatter.format(startTime)
    }

    // 2. Relative Time & Dynamic Delay Calculation
    const diffMs = startTime - now
    const isFuture = diffMs > 0
    const relative = getTwoUnits(diffMs)

    const relativeText =
      isFuture ? `in ${relative.text}` : `${relative.text} ago`
    el.textContent = `${displayString} - ${relativeText}`

    // 3. Determine the shortest delay needed for this specific element
    let currentDelay = 1000 // Default 1s if showing seconds
    if (relative.unit === "hour")
      currentDelay = 60000 * (60 - now.getMinutes()) // Sync to next hour
    if (relative.unit === "day") currentDelay = 3600000 // Check every hour if showing days

    // Keep the smallest delay found across all elements
    nextUpdateDelay = Math.min(nextUpdateDelay, currentDelay)
  })

  // Schedule the next run
  setTimeout(updateTimes, nextUpdateDelay)
}

// Initial call
updateTimes()
