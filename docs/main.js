Object.assign(globalThis, console)
const a = loadlib("allfuncs")
;(async () => {
  await a.bodyload()
  a.listen(window, "hashchange", function handleHashChange() {
    const hash = location.hash

    if (!hash) {
      removeFrame()
      return
    }

    const found = loaderMap[location.hash]

    if (found) {
      loadFrame(found.dataset.url)
    } else {
      removeFrame()
    }
  })
  var loaders = a.qsa(".iframeLoader")
  const loaderMap = Object.fromEntries(
    loaders.map((el) => [el.getAttribute("href"), el]),
  )

  var startHTML = null
  var found = false
  if (location.hash && (found = loaderMap[location.hash])) {
    loadFrame(found.dataset.url)
  }
  a.listen(loaders, "click", function (e) {
    loadFrame(this.dataset.url)
  })
  function removeFrame() {
    a.qs(".center").innerHTML = startHTML
  }
  function loadFrame(url) {
    var c = a.qs(".center")
    startHTML ??= c.innerHTML
    c.innerHTML = ""
    c.appendChild(
      a.newelem(
        "div",
        {
          marginTop: "10px",
          marginBottom: "10px",
          class: "col full",
        },
        [
          a.newelem(
            "nav",
            {
              display: "flex",
              marginBottom: "10px",
            },
            [
              a.newelem("div", { flexGrow: 2 }),
              a.newelem(
                "button",
                {
                  onclick() {
                    location.hash = ""
                    removeFrame()
                  },
                },
                ["X"],
              ),
            ],
          ),
          a.newelem("iframe", {
            display: "flex",
            src: url,
            class: "fullh",
          }),
        ],
      ),
    )
  }
})()
