Object.assign(globalThis, console)
const a = loadlib("allfuncs")
;(async () => {
  await a.bodyload()
  var loaders = a.qsa(".iframeLoader")
  var startHTML = null
  var found = false
  if (
    location.hash &&
    (found = loaders.find((e) => e.href == location.href))
  ) {
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
    startHTML = c.innerHTML
    c.innerHTML = ""
    c.appendChild(
      a.newelem(
        "div",
        {
          class: "fullh fullw",
          marginTop: "10px",
          marginBottom: "10px",
          class: "col",
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
