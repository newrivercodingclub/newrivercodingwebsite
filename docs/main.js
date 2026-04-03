class SmartTime extends HTMLElement {
  constructor() {
    super()
    this._timer = null
  }

  // Monitor these attributes for changes
  static get observedAttributes() {
    return ["time", "endtime"]
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
    const endTimeAttr = this.getAttribute("endtime")
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
    if (endTimeAttr) {
      const endTime = new Date(endTimeAttr)
      displayString = dateFormatter.formatRange(startTime, endTime)
      displayString += ` (${this.getTwoUnits(endTime - startTime).text})`
    } else {
      displayString = dateFormatter.format(startTime)
    }

    const diffMs = startTime - now
    const isFuture = diffMs > 0
    const relative = this.getTwoUnits(diffMs)
    const relativeText =
      isFuture ? `in ${relative.text}` : `${relative.text} ago`

    this.textContent = `${displayString} - ${relativeText}`

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
