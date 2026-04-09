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

    const startTime = new Date(startTimeAttr)
    console.log("Start time:", startTime) // Check if the start time is valid
    if (isNaN(startTime)) {
      console.error("Invalid start time:", startTimeAttr)
      return // Exit if invalid
    }

    const repeat = this.getAttribute("repeat") || null
    const templateStart =
      repeat ? this.getNextOccurrence(startTime, repeat) : startTime

    const endTimeAttr =
      this.getAttribute("endtime") ?? this.getAttribute("end-time")
    let endTime = null
    if (endTimeAttr) {
      const endTimeParsed = new Date(endTimeAttr)
      console.log("End time:", endTimeParsed) // Check if the end time is valid
      if (isNaN(endTimeParsed)) {
        console.error("Invalid end time:", endTimeAttr)
        return // Exit if invalid
      }

      // Calculate the duration from the raw attributes, then apply to the
      // next occurrence so a repeating event keeps the correct end time.
      const durationMs = endTimeParsed - startTime
      if (isNaN(durationMs) || durationMs < 0) {
        console.error("Invalid duration:", durationMs)
        return // Exit if duration is invalid
      }
      endTime = new Date(templateStart.getTime() + durationMs)
    }

    const now = new Date()

    // Create a custom Intl.DateTimeFormat (omit timeZone or use local time)
    const dateFormatter = new Intl.DateTimeFormat(
      navigator.language,
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short", // Optional, adds the timezone abbreviation like PST, GMT
      },
    )

    // 1. Formatting the start and end times
    let displayString = []
    let duration = ""
    if (endTime) {
      // formatRangeToParts gives parts tagged with source:
      //   "startRange" | "shared" | "endRange"
      // The formatter automatically suppresses repeated fields (e.g. same date)
      // and inserts a locale-appropriate separator between the two times.
      const rangeParts = dateFormatter.formatRangeToParts(
        templateStart,
        endTime,
      )
      var r = Object.fromEntries(
        rangeParts.map((e) => [e.type + " " + e.source, e.value]),
      )
      log(rangeParts, r)
      // Wrap each source group in its own span so start/end can be styled
      // independently if desired, while still getting per-field classes.
      const startElems = this.partsToElems(
        rangeParts.filter((p) => p.source === "startRange"),
      )
      const sharedElems = this.partsToElems(
        rangeParts.filter(
          (p) =>
            p.source === "shared" &&
            p.type != "timeZoneName" &&
            p.type != "dayPeriod",
        ),
      )
      const endElems = this.partsToElems(
        rangeParts.filter((p) => p.source === "endRange"),
      )
      // var aa = rangeParts.find(
      //   (p) =>
      //     p.source === "shared" &&p.type == "dayPeriod"
      //     (p.type == "timeZoneName" || ),
      // )
      var apmIfShared = [
        rangeParts.find(
          (p) => p.source === "shared" && p.type == "dayPeriod",
        ),
      ]
      displayString = [
        ...sharedElems,
        a.newelem("span", { class: "dt-start" }, [sharedElems]),
        a.newelem("span", { class: "dt-separator" }, [" ("]),
        a.newelem("span", { class: "dt-start" }, [
          ...startElems,
          apmIfShared ? this.partsToElems(apmIfShared) : null,
        ]),
        a.newelem("span", { class: "dt-separator" }, [" to "]),
        a.newelem("span", { class: "dt-start" }, [
          ...endElems,
          apmIfShared ? this.partsToElems(apmIfShared) : null,
        ]),
        a.newelem("span", { class: "dt-separator" }, [")"]),
        this.partsToElems([
          rangeParts.find(
            (p) => p.source === "shared" && p.type == "timeZoneName",
          ),
        ]),
        // a.newelem("span", { class: "dt-end" }, endElems),
      ]

      duration = this.getTwoUnits(endTime - startTime).text
    } else {
      // formatToParts gives [{type, value}, …] - locale-correct, timezone-aware
      displayString = this.partsToElems(
        dateFormatter.formatToParts(templateStart),
      )
    }

    const diffMs = templateStart - now
    const isFuture = diffMs > 0
    const relative = this.getTwoUnits(diffMs)

    // Replace children with formatted content
    this.replaceChildren(
      ...[
        a.newelem("a", { href: this.generateUniversalLink() }, [
          a.newelem("span", { class: "dt-range" }, displayString),
        ]),
        a.newelem("span", { class: "dt-separator" }, [" ("]),
        duration ?
          a.newelem("span", { class: "dt-duration" }, [duration])
        : null,
        a.newelem("span", { class: "dt-separator" }, [")"]),
        a.newelem("span", { class: "dt-separator" }, [" - "]),
        a.newelem("span", { class: "dt-relative" }, [
          a.newelem("span", {}, [
            isFuture ? "starts in " : "started ",
            a.newelem("span", { class: "dt-separator" }, ["("]),
            relative.text
              .replace(/[\u2009\u00a0]/g, " ") // Replace Thin Space (&thinsp;) and Non-Breaking Space (&nbsp;)
              .replace(/[\u2013\u2014]/g, "-") // Normalize En-dash and Em-dash to a standard hyphen
              .trim(),
            a.newelem("span", { class: "dt-separator" }, [")"]),
            isFuture ? "" : " ago",
          ]),
        ]),
      ].filter(Boolean),
    )

    // 2. Schedule next update based on unit
    let delay = 1000
    if (relative.unit === "hour")
      delay = 60000 * (60 - now.getMinutes())
    if (relative.unit === "day") delay = 3600000

    this._timer = setTimeout(() => this.update(), delay)
  }

  // Fix `getTwoUnits` to handle invalid durations
  getTwoUnits(ms) {
    const totalSecs = Math.floor(Math.abs(ms) / 1000)
    if (isNaN(totalSecs))
      return { text: "Invalid duration", unit: "minute" } // Handle NaN duration

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
  // Maps Intl part types to CSS classes
  static get partClassMap() {
    return {
      weekday: "dt-dow",
      month: "dt-month",
      day: "dt-day",
      year: "dt-year",
      hour: "dt-time",
      minute: "dt-time",
      second: "dt-time",
      dayPeriod: "dt-time",
      timeZoneName: "dt-tz",
      literal: "dt-separator",
    }
  }

  // Converts an array of Intl formatToParts/formatRangeToParts entries
  // into styled <span> elements. Consecutive parts sharing the same class
  // are merged so you don't get two adjacent "dt-time" spans for H and M.
  partsToElems(parts) {
    // Merge adjacent parts that map to the same class (e.g. hour + literal ":" + minute → one dt-time span)
    const merged = []
    for (const { type, value } of parts) {
      const cls = SmartTime.partClassMap[type] ?? null
      const prev = merged[merged.length - 1]
      if (prev && prev.cls === cls) {
        prev.value += value
      } else {
        merged.push({ cls, value })
      }
    }

    return merged.map(({ cls, value }) =>
      cls ?
        a.newelem("span", { class: cls }, [value])
      : a.newelem("span", {}, [value]),
    )
  }
}

// Define the new element
customElements.define("smart-time", SmartTime)
