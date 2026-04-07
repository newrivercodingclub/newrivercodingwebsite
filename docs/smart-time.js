class SmartTime extends HTMLElement {
  constructor() {
    super()
    this._timer = null
  }

  // Monitor these attributes for changes
  static get observedAttributes() {
    return ["time", "end-time", "repeat"]
  }

  // If attributes change (or are set), re-render
  attributeChangedCallback() {
    this.update()
  }

  connectedCallback() {
    this.update()
  }

  disconnectedCallback() {
    clearTimeout(this._timer)
  }
  // Inside your SmartTime class, you can create this "universal" link:
  generateUniversalLink() {
    const start = this.getAttribute("time").replace(/[-:]/g, "")
    const endAttr = this.getAttribute("end-time")
    const end = endAttr ? endAttr.replace(/[-:]/g, "") : start

    // Minimal iCalendar file format
    const icsFile = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      "SUMMARY:Saved Event",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n")

    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsFile)}`
  }
  // Given a template Date and a repeat mode, returns the next occurrence >= now.
  // The template's day-of-month (monthly) or day-of-week (weekly) and time-of-day
  // are preserved; year/month are advanced as needed.
  getNextOccurrence(template, repeat) {
    const now = new Date()

    if (repeat === "monthly") {
      // Start from the same day/time this month
      const candidate = new Date(
        now.getFullYear(),
        now.getMonth(),
        template.getDate(),
        template.getHours(),
        template.getMinutes(),
        template.getSeconds(),
      )
      // If that moment has already passed, roll forward one month
      if (candidate <= now) {
        candidate.setMonth(candidate.getMonth() + 1)
      }
      return candidate
    }

    if (repeat === "weekly") {
      const targetDay = template.getDay() // 0=Sun…6=Sat
      const candidate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        template.getHours(),
        template.getMinutes(),
        template.getSeconds(),
      )
      const daysAhead = (targetDay - candidate.getDay() + 7) % 7
      candidate.setDate(candidate.getDate() + daysAhead)
      if (candidate <= now) candidate.setDate(candidate.getDate() + 7)
      return candidate
    }

    if (repeat === "daily") {
      const candidate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        template.getHours(),
        template.getMinutes(),
        template.getSeconds(),
      )
      if (candidate <= now) candidate.setDate(candidate.getDate() + 1)
      return candidate
    }

    return template // no repeat, use as-is
  }

  getTwoUnits(ms) {
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

  update() {
    clearTimeout(this._timer)

    const startTimeAttr = this.getAttribute("time")
    if (!startTimeAttr) return

    const repeat = this.getAttribute("repeat") || null
    const templateStart = new Date(startTimeAttr)
    const startTime =
      repeat ?
        this.getNextOccurrence(templateStart, repeat)
      : templateStart

    // Support both "endtime" and "end-time" attribute spellings
    const endTimeAttr =
      this.getAttribute("endtime") ?? this.getAttribute("end-time")
    let endTime = null
    if (endTimeAttr) {
      // Preserve the original duration, applied to the resolved start
      const templateEnd = new Date(endTimeAttr)
      const durationMs = templateEnd - templateStart
      endTime = new Date(startTime.getTime() + durationMs)
    }

    const now = new Date()

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

    // 1. Formatting
    let displayString = ""
    let duration = ""
    if (endTime) {
      displayString = dateFormatter.formatRange(startTime, endTime)
      duration = this.getTwoUnits(endTime - startTime).text
    } else {
      displayString = dateFormatter.format(startTime)
    }

    const diffMs = startTime - now
    const isFuture = diffMs > 0
    const relative = this.getTwoUnits(diffMs)
    const relativeText =
      isFuture ?
        `starts in ${relative.text}`
      : `started ${relative.text} ago`

    this.innerHTML = `
        <a href="${this.generateUniversalLink()}"><span class="dt-range">${displayString}</span></a>
        <span class="dt-grouping">(</span>
        ${duration ? `<span class="dt-duration">${duration}</span>` : ""}
        <span class="dt-grouping">)</span>
        <span class="dt-separator"> - </span>
        <span class="dt-relative">${relativeText}</span>
      `
      .replace(/[\u2009\u00a0]/g, " ") // Replace Thin Space (&thinsp;) and Non-Breaking Space (&nbsp;)
      .replace(/[\u2013\u2014]/g, "-") // Normalize En-dash and Em-dash to a standard hyphen
      .trim()

    // 2. Schedule next update based on unit
    let delay = 1000
    if (relative.unit === "hour")
      delay = 60000 * (60 - now.getMinutes())
    if (relative.unit === "day") delay = 3600000

    this._timer = setTimeout(() => this.update(), delay)
  }
}

// Define the new element
customElements.define("smart-time", SmartTime)
