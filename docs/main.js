Object.assign(globalThis, console)
const a = loadlib("allfuncs")
;(async () => {
  await a.bodyload()
  a.listen(a.qsa(".iframeLoader"), "click", function (e) {
    e.preventDefault()
    loadFrame(this.dataset.url)
  })
  function loadFrame(url) {
    var c = a.qs(".center")
    c.innerHTML = ""
    c.appendChild(
      a.newelem("iframe", {
        class: "fullh fullw",
        marginTop: "10px",
        marginBottom: "10px",
        src: url,
      }),
    )
  }
})()
