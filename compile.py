#!/usr/bin/env python3
"""
Static site compiler for GitHub Pages.
Replicates the FastAPI dynamic routing logic and compiles to /docs.

Usage:
  python compile.py           # compile once
  python compile.py --watch   # compile + watch for changes
"""

import re
import sys
import shutil
import argparse
import time
import threading
from pathlib import Path

# ── Configuration ────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
DEFAULT_DIR = BASE_DIR / "About"
OUTPUT_DIR = BASE_DIR / "docs"

# Folders to never treat as page routes
IGNORED_DIRS = {"docs", "__pycache__", ".git", ".github", "node_modules"}

# Static file extensions to copy from BASE_DIR → docs/
STATIC_EXTS = {
  ".scss",
  ".js",
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
}

# ── Core compile logic ────────────────────────────────────────────────────────


def get_processed_html(current_folder: Path) -> str:
  """Reads root index.html and replaces [tags] with snippets from current_folder."""
  index_path = BASE_DIR / "index.html"
  if not index_path.exists():
    print("  ✗  Critical Error: root index.html not found.")
    return "<h1>Error: index.html missing</h1>"

  return replacePlaceholders(current_folder, index_path)


def replacePlaceholders(current_folder: Path, index_path: Path) -> str:
  html_content = index_path.read_text(encoding="utf-8")

  def replace_match(match):
    tag_name = match.group(1)  # e.g. "left", "center", "right"
    file_name = f"{tag_name}.html"

    target_path = current_folder / file_name
    if not target_path.exists():  # fallback to About/
      target_path = DEFAULT_DIR / file_name

    if target_path.exists():
      return replacePlaceholders(current_folder, target_path)
    return ""  # tag present but no file → empty

  return re.sub(r"\[(\w+)\]", replace_match, html_content)


def rewrite_asset_paths(html: str, depth: int) -> str:
  """
  Rewrites root-relative asset URLs to relative paths so the site works
  both on GitHub Pages (served under /repo-name/) and locally.

  depth=0  →  docs/index.html          →  prefix "./"
  depth=1  →  docs/About/index.html    →  prefix "../"
  """
  prefix = ("../" * depth) or "./"

  def replace_url(match):
    attr, path = match.group(1), match.group(2)
    # Leave protocol-relative, external, or already-relative URLs alone
    if path.startswith(("http", "//", ".")):
      return match.group(0)
    return f'{attr}="{prefix}{path.lstrip("/")}"'

  # Match href="..." and src="..." that start with /
  return re.sub(r'(href|src)="(/[^"]*)"', replace_url, html)


def discover_routes() -> dict[str, Path]:
  """
  Returns a mapping of  output_path → source_folder  for every route.

  Route rules (mirrors FastAPI server):
    /           → About/
    /About      → About/
    /<Folder>   → <Folder>/   (if it exists, else About/)
  """
  routes: dict[str, Path] = {}

  # Root and /About both point at DEFAULT_DIR
  routes["index.html"] = DEFAULT_DIR
  routes["About/index.html"] = DEFAULT_DIR

  for item in sorted(BASE_DIR.iterdir()):
    if not item.is_dir():
      continue
    if item.name in IGNORED_DIRS or item.name.startswith("."):
      continue
    if item.name == "About":
      continue  # already added above
    key = f"{item.name}/index.html"
    routes[key] = item if item.is_dir() else DEFAULT_DIR

  return routes


def copy_static_assets():
  """Copy CSS / JS / images / fonts from BASE_DIR → docs/."""
  copied = []
  for f in BASE_DIR.iterdir():
    if f.is_file() and f.suffix in STATIC_EXTS:
      dest = OUTPUT_DIR / f.name
      shutil.copy2(f, dest)
      copied.append(f.name)
  if copied:
    print(f"  ✔  Static assets: {', '.join(copied)}")


def compile_all():
  """Full compile pass: clear docs/, write every route, copy assets."""
  print(f"\n{'─'*50}")
  print(f"  Compiling → {OUTPUT_DIR.relative_to(BASE_DIR)}/")
  print(f"{'─'*50}")

  OUTPUT_DIR.mkdir(exist_ok=True)

  routes = discover_routes()

  for rel_out, src_folder in routes.items():
    out_path = OUTPUT_DIR / rel_out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    depth = len(Path(rel_out).parts) - 1  # index.html=0, About/index.html=1
    html = get_processed_html(src_folder)
    html = rewrite_asset_paths(html, depth)
    out_path.write_text(html, encoding="utf-8")
    label = (
      src_folder.relative_to(BASE_DIR)
      if src_folder != DEFAULT_DIR
      else "About (default)"
    )
    print(f"  ✔  {rel_out:<30}  ← {label}/")

  copy_static_assets()
  print(f"{'─'*50}")
  print(f"  Done - {len(routes)} page(s) compiled.\n")


# ── File watcher ──────────────────────────────────────────────────────────────


def watch():
  """Watch BASE_DIR for changes and recompile on any .html / .scss / .js edit."""
  try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
  except ImportError:
    print("watchdog is not installed. Run:  pip install watchdog")
    sys.exit(1)

  class Handler(FileSystemEventHandler):
    def __init__(self):
      self._timer: threading.Timer | None = None
      self._lock = threading.Lock()

    def on_modified(self, event):
      # Ignore docs/ output dir and hidden files
      src = Path(event.src_path)
      if OUTPUT_DIR in src.parents or src.name.startswith("."):
        return
      if src.suffix not in {
        ".html",
        ".scss",
        ".js",
        ".ico",
        ".png",
        ".jpg",
        ".jpeg",
        ".svg",
        ".woff",
        ".woff2",
        ".ttf",
      }:
        return

      # Reset-timer debounce: cancel any pending compile and restart the
      # 300 ms countdown so the compile always runs after the burst ends,
      # never dropping the final change in a rapid sequence.
      with self._lock:
        if self._timer is not None:
          self._timer.cancel()
        self._timer = threading.Timer(0.3, self._fire, args=[src])
        self._timer.daemon = True
        self._timer.start()

    def _fire(self, src: Path):
      with self._lock:
        self._timer = None
      print(f"  ↻  Changed: {src.relative_to(BASE_DIR)}")
      compile_all()

  handler = Handler()
  observer = Observer()
  observer.schedule(handler, str(BASE_DIR), recursive=True)
  observer.start()

  print(f"  Watching  {BASE_DIR}  (Ctrl-C to stop)")
  try:
    while True:
      time.sleep(1)
  except KeyboardInterrupt:
    observer.stop()
    print("\n  Stopped.")
  observer.join()


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
  parser = argparse.ArgumentParser(description="Static site compiler → docs/")
  parser.add_argument(
    "--watch",
    "-w",
    action="store_true",
    help="Watch for file changes and recompile automatically",
  )
  args = parser.parse_args()

  compile_all()  # always do an initial full compile

  if args.watch:
    watch()
