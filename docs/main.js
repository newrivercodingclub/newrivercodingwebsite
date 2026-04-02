document.querySelectorAll(".local-time").forEach((el) => {
  // 1. Get the ISO string from the attribute
  const dateUpdate = new Date(el.getAttribute("datetime"))

  // 2. Format it using the user's locale settings
  const formatter = new Intl.DateTimeFormat(navigator.language, {
    weekday: "long", // "Thursday"
    year: "numeric", // "2026"
    month: "long", // "April"
    day: "numeric", // "2"
    hour: "numeric", // "11"
    minute: "2-digit", // "51"
  })

  // 3. Update the text
  el.textContent = formatter.format(dateUpdate)
})
