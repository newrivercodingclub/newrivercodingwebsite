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
  // Converts a Date to iCalendar UTC format: "20260107T183000Z"
  toICalUTC(date) {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")
  }

  // Inside your SmartTime class, you can create this "universal" link:
  // Accepts the already-resolved startTime and endTime Dates from update()
  // so repeating events use the next occurrence, not the template date.
  generateUniversalLink(startTime, endTime) {
    const start = this.toICalUTC(startTime)
    const end = this.toICalUTC(endTime ?? startTime)

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
      return { text: `${d}d${h > 0 ? ` ${h}h` : ""}`, unit: "h" }
    if (h > 0)
      return { text: `${h}h${m > 0 ? ` ${m}m` : ""}`, unit: "m" }
    return { text: `${m}m${s > 0 ? ` ${s}s` : ""}`, unit: "s" }
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

    const endTimeAttr = this.getAttribute("end-time")
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
    log(displayString)
    const diffMs = startTime - now
    const relative = this.getTwoUnits(diffMs)
    let targetDiff = 0
    let unitReference = "s"
    const timeText = { ON_TIME: 2, LATE: 1, EARLY: 3 }
    var selectedTimeText
    // now before start
    if (now < startTime) {
      // Future
      const rel = this.getTwoUnits(startTime - now)
      targetDiff = startTime - now
      unitReference = rel.unit
      selectedTimeText = timeText.EARLY
    } else {
      // now after start
      // now bwfore end
      if (endTime && now < endTime) {
        // Currently happening
        const rel = this.getTwoUnits(endTime - now)
        targetDiff = endTime - now
        unitReference = rel.unit
        selectedTimeText = timeText.ON_TIME
      } else {
        // now after start
        // now after end
        // Past (either past the start if no end, or past the end)
        const compareTime = endTime || startTime
        const rel = this.getTwoUnits(now - compareTime)
        targetDiff = now - compareTime
        unitReference = rel.unit
        selectedTimeText = timeText.LATE
      }
    }
    this.replaceChildren(
      ...[
        a.newelem(
          "a",
          { href: this.generateUniversalLink(startTime, endTime) },
          [
            displayString.match(/[\d\w]+|[^\d\w]+/g).map((part) =>
              a.newelem(
                "span",
                {
                  class:
                    /^[\d\w]+$/.test(part) ? "dt-range" : (
                      "dt-separator"
                    ),
                },
                [part],
              ),
            ),
          ],
        ),
        ...(duration ?
          [
            a.newelem("span", { class: "dt-separator" }, [" ("]),
            a.newelem("span", { class: "dt-duration" }, [duration]),
            a.newelem("span", { class: "dt-separator" }, [")"]),
          ]
        : []),
        a.newelem("span", { class: "dt-separator" }, [" - "]),
        a.newelem("span", { class: "dt-relative" }, [
          a.newelem("span", {}, [
            {
              [timeText.EARLY]: "starts in",
              [timeText.ON_TIME]: "ends in",
              [timeText.LATE]: "ended", //ended?
            }[selectedTimeText] + " ",
            a.newelem("span", { class: "dt-separator" }, ["("]),
            relative.text
              .replace(/[\u2009\u00a0]/g, " ") // Replace Thin Space (&thinsp;) and Non-Breaking Space (&nbsp;)
              .replace(/[\u2013\u2014]/g, "-") // Normalize En-dash and Em-dash to a standard hyphen
              .trim(),
            a.newelem("span", { class: "dt-separator" }, [")"]),
            {
              [timeText.EARLY]: "",
              [timeText.ON_TIME]: "",
              [timeText.LATE]: " ago",
            }[selectedTimeText],
          ]),
        ]),
      ].filter(Boolean),
    )

    // 2. Schedule next update based on unit
    let delay = {
      s: 1000 - now.getMilliseconds(),
      m: 1000 * (60 - now.getSeconds()),
      h: 1000 * 60 * (60 - now.getMinutes()),
      d: 1000 * 60 * 60 * (12 - now.getHours()),
    }[relative.unit]

    log(delay, relative.unit, relative)
    this._timer = setTimeout(() => this.update(), delay)
  }
}

// Define the new element
customElements.define("smart-time", SmartTime)
