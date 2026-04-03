document.querySelectorAll("time").forEach((el) => {
  // 1. Get the ISO string from the attribute
  const time = new Date(el.getAttribute("time"))

  // 2. Format it using the user's locale settings
  const formatter = new Intl.DateTimeFormat(navigator.language, {
    weekday: "long", // "Thursday"
    year: "numeric", // "2026"
    month: "long", // "April"
    day: "numeric", // "2"
    hour: "numeric", // "11"
    minute: "2-digit", // "51"
  })

  if (el.hasAttribute("endTime")) {
    const endTime = new Date(el.getAttribute("endTime"))
    // formatRange automatically collapses shared parts:
    // same day  → "Thursday, April 2, 2026, 11:00 AM - 1:00 PM"
    // same hour → "Thursday, April 2, 2026, 11:00 - 11:45 AM"
    // diff days → "Thursday, April 2 - Friday, April 3, 2026"
    el.textContent = formatter.formatRange(time, endTime)
  } else {
    el.textContent = formatter.format(time)
  }
})
