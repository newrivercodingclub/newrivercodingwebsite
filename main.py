import re
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse

app = FastAPI()

# Configuration
BASE_DIR = Path(__file__).parent
DEFAULT_DIR = BASE_DIR / "About"


def get_processed_html(current_folder: Path):
  """Reads index.html and replaces [tags] with content from files."""
  index_path = BASE_DIR / "index.html"

  if not index_path.exists():
    return "Critical Error: root index.html not found."

  with open(index_path, "r") as f:
    html_content = f.read()

  def replace_match(match):
    tag_name = match.group(1)  # e.g., "left", "center", "right"
    file_name = f"{tag_name}.html"

    # 1. Try the current route's folder
    target_path = current_folder / file_name

    # 2. Fallback to the 'About' folder if not found
    if not target_path.exists():
      target_path = DEFAULT_DIR / file_name

    if target_path.exists():
      with open(target_path, "r") as snippet:
        return snippet.read()

    return f""

  return re.sub(r"\[(\w+)\]", replace_match, html_content)


# --- Routes ---


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
  return FileResponse(BASE_DIR / "favicon.ico")


@app.get("/{file_name}.css")
def stylesheets(file_name: str):
  return FileResponse(BASE_DIR / f"{file_name}.css")


@app.get("/{file_name}.js")
def scripts(file_name: str):
  return FileResponse(BASE_DIR / f"{file_name}.js")


@app.get("/{full_path:path}", response_class=HTMLResponse)
def dynamic_router(full_path: str = ""):
  # Handle root "/" or "/About" as the same thing
  clean_path = full_path.strip("/")

  if clean_path == "" or clean_path.lower() == "about":
    target_folder = DEFAULT_DIR
  else:
    target_folder = BASE_DIR / clean_path

  # Fallback to About if the folder doesn't exist at all
  if not target_folder.is_dir():
    target_folder = DEFAULT_DIR

  return get_processed_html(target_folder)
