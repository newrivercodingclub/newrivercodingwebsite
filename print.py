import json as oldjson
import re
from functools import partial as bind
from typing import *
import os, inspect, csv


class f:
  @staticmethod
  def read(
    file,
    default="",
    asbinary=False,
    buffering: int = -1,
    encoding: str | None = None,
    errors: str | None = None,
    newline: str | None = None,
    closefd: bool = True,
    opener=None,
  ):
    if os.path.isfile(file):
      with open(
        file,
        "r" + ("b" if asbinary else ""),
        buffering=buffering,
        encoding=encoding,
        errors=errors,
        newline=newline,
        closefd=closefd,
        opener=opener,
      ) as f:
        text = f.read()
      if text:
        return text
      return default
    else:
      with open(
        file,
        "w" + ("b" if asbinary else ""),
        buffering=buffering,
        encoding=encoding,
        errors=errors,
        newline=newline,
        closefd=closefd,
        opener=opener,
      ) as f:
        f.write(default)
      return default

  @staticmethod
  def writeCsv(file, rows):
    with open(file, "w", encoding="utf-8", newline="") as f:
      w = csv.writer(f)
      w.writerows(rows)
    return rows

  @staticmethod
  def write(
    file,
    text,
    asbinary=False,
    buffering: int = -1,
    encoding: str | None = None,
    errors: str | None = None,
    newline: str | None = None,
    closefd: bool = True,
    opener=None,
  ):
    with open(
      file,
      "w" + ("b" if asbinary else ""),
      buffering=buffering,
      encoding=encoding,
      errors=errors,
      newline=newline,
      closefd=closefd,
      opener=opener,
    ) as f:
      f.write(text)
    return text

  @staticmethod
  def append(
    file,
    text,
    asbinary=False,
    buffering: int = -1,
    encoding: str | None = None,
    errors: str | None = None,
    newline: str | None = None,
    closefd: bool = True,
    opener=None,
  ):
    with open(
      file,
      "a",
      buffering=buffering,
      encoding=encoding,
      errors=errors,
      newline=newline,
      closefd=closefd,
      opener=opener,
    ) as f:
      f.write(text)
    return text

  @staticmethod
  def writeline(
    file,
    text,
    buffering: int = -1,
    encoding: str | None = None,
    errors: str | None = None,
    newline: str | None = None,
    closefd: bool = True,
    opener=None,
  ):
    with open(
      file,
      "a",
      buffering=buffering,
      encoding=encoding,
      errors=errors,
      newline=newline,
      closefd=closefd,
      opener=opener,
    ) as f:
      f.write("\n" + text)
    return text


import inspect

caller_file = None

for frame in inspect.stack():
  path = frame.filename

  # Skip non-python files
  if not path.endswith(".py"):
    continue

  # Skip virtualenv + site-packages
  if ".venv" in path:
    continue
  if "site-packages" in path:
    continue
  if "debugpy" in path:
    continue

  caller_file = path
  break  # first valid real python file

# Fallback safety
if caller_file is None:
  caller_file = __file__

MAIN_FILE_DIR = os.path.dirname(os.path.abspath(caller_file))
LOG_FILE_NAME = os.path.splitext(os.path.basename(caller_file))[0] + ".ans"

# print(hasattr(sys.modules["__main__"], "__file__"), 'hasattr(sys.modules["__main__"], "__file__")')
# if hasattr(sys.modules["__main__"], "__file__"):
#   p = sys.modules["__main__"].__file__
#   assert isinstance(p, str)
#   caller_file = Path(p).resolve()
#   main_dir = caller_file.parent
# else:
#   # fallback (interactive shell, etc.)
#   main_dir = Path.cwd()

# os.chdir(main_dir)


def fg(color=None):
  """returns ascii escape for foreground colors

  Args:
    color (str, optional): the number of the collor to get. Defaults to None - if none return the remove color sequence instead.

  Returns (str): ascii escape for foreground colors
  """
  return "\33[38;5;" + str(color) + "m" if color else "\u001b[0m"


def bg(color=None):
  """returns ascii escape for background colors

  Args:
    color (str, optional): the number of the collor to get. Defaults to None - if none return the remove color sequence instead.

  Returns (str): ascii escape for background colors
  """
  return "\33[48;5;" + str(color) + "m" if color else "\u001b[0m"


prevprint = print  # type:ignore


def getcolor(color):
  """will make better later

  Args:
    color (string): one of the set colors

  Raises (ValueError): if color is not a valid color

  Returns (str): an ascii escape sequence of the color
  """
  # if plainprint:
  #     return ""
  match color.lower():
    case "end":
      return "\x1b[0m"
    case "nc":
      return "\x1b[0m"
    case "red":
      return fg(1) or "\033[0m"
    case "purple":
      return fg(92)
    case "blue":
      return fg(19)
    case "green":
      return fg(28)
    case "magenta":
      return fg(90)
    case "bright blue":
      return fg(27)
    case "yellow":
      return fg(3)
    case "bold":
      return "\033[1m"
    case "underline":
      return "\033[4m"
    case "white":
      return fg(15)
    case "cyan":
      return fg(45) or "\033[96m"
    case "orange":
      return fg(208)
    case "pink":
      return fg(213)
    case _:
      raise ValueError(f"{color} is not a valid color")


def logfile(
  type, *data: Any, sep: str | None = " ", end: str | None = "\n", format: bool = True
):
  if not sep:
    sep = " "
  if not end:
    end = "\n"
  if end != "\n":
    type = ""
  else:
    type += " "
  if format:
    data = sep.join(map(formatitem, data))  # type:ignore
  else:
    data = sep.join(map(str, data))  # type:ignore
  dir = os.path.join(MAIN_FILE_DIR, "logs")
  if not os.path.exists(dir):
    os.makedirs(dir)
  f.append(
    os.path.join(dir, LOG_FILE_NAME),
    type + data + getcolor("end") + end,
    encoding="utf-8",
  )


from functools import partial as bind
from typing import *
import os
import inspect
import csv


class CustomPrint(Protocol):
  """Defines the 'shape' of our print function so Mypy doesn't complain."""

  showdebug: bool
  showinfo: bool
  defaultiscolor: bool

  def __call__(
    self,
    *a: Any,
    sep: str = " ",
    end: str = "\n",
    file: Any = None,
    flush: bool = False,
  ) -> None: ...
  def plain(
    self,
    *a: Any,
    sep: str = " ",
    end: str = "\n",
    file: Any = None,
    flush: bool = False,
  ) -> None: ...
  def debug(
    self,
    *a: Any,
    sep: str = " ",
    end: str = "\n",
    file: Any = None,
    flush: bool = False,
  ) -> None: ...
  def info(
    self,
    *a: Any,
    sep: str = " ",
    end: str = "\n",
    file: Any = None,
    flush: bool = False,
  ) -> None: ...
  def warn(
    self,
    *a: Any,
    sep: str = " ",
    end: str = "\n",
    file: Any = None,
    flush: bool = False,
  ) -> None: ...
  def error(
    self,
    *a: Any,
    sep: str = " ",
    end: str = "\n",
    file: Any = None,
    flush: bool = False,
  ) -> None: ...
  def success(
    self,
    *a: Any,
    sep: str = " ",
    end: str = "\n",
    file: Any = None,
    flush: bool = False,
  ) -> None: ...


# --- Logic Implementation ---

prevprint = print  # Keep original


def format_and_log(
  prefix_type: str,
  *a: Any,
  sep=" ",
  end="\n",
  format_items=True,
  file=None,
  flush=False,
):
  # Log to file logic (Simplified for brevity, use your existing logfile() here)
  # ... your logfile implementation ...

  if format_items:
    formatted_args = map(bind(formatitem, nocolor=False), a)
    prevprint(
      prefix_type,
      *formatted_args,
      getcolor("end"),
      sep=sep,
      end=end,
      file=file,
      flush=flush,
    )
  else:
    prevprint(prefix_type, *a, sep=sep, end=end, file=file, flush=flush)


def _main_print(*a: Any, sep=" ", end="\n", file=None, flush=False):
  """The base implementation of your custom print."""
  if custom_print.defaultiscolor:
    formatted_args = map(bind(formatitem, nocolor=False), a)
    prevprint(
      *formatted_args, getcolor("end"), sep=sep, end=end, file=file, flush=flush
    )
  else:
    prevprint(*a, sep=sep, end=end, file=file, flush=flush)


# --- Wrapping and Exporting ---

# Casting the function to our Protocol type
custom_print: CustomPrint = _main_print  # type: ignore


# Attaching methods
def _debug(*a, sep=" ", end="\n", **kwargs):
  if custom_print.showdebug:
    format_and_log(
      f"{getcolor('BLUE')}[DEBUG]{getcolor('END')}",
      *a,
      sep=sep,
      end=end,
      **kwargs,
    )


def _success(*a, sep: str | None = " ", end: str | None = "\n", **kwargs):
  format_and_log(
    f"{getcolor('GREEN')}[SUCCESS]{getcolor('END')}",
    *a,
    sep=sep,
    end=end,
    **kwargs,
  )


def _error(*a, sep=" ", end="\n", **kwargs):
  format_and_log(
    f"{getcolor('RED')}[ERROR]{getcolor('END')}", *a, sep=sep, end=end, **kwargs
  )


def _warn(*a, sep=" ", end="\n", **kwargs):
  format_and_log(
    f"{getcolor('YELLOW')}[WARNING]{getcolor('END')}",
    *a,
    sep=sep,
    end=end,
    **kwargs,
  )


# Assign attributes
custom_print.debug = _debug  # type:ignore
custom_print.error = _error  # type:ignore
custom_print.plain = prevprint  # type:ignore
custom_print.success = _success  # type:ignore
custom_print.warn = _warn  # type:ignore
custom_print.showdebug = True
custom_print.showinfo = False
custom_print.defaultiscolor = True

# Replace global print
print = custom_print

# --- Test ---


def formatitem(item: Any, tab=-2, isarrafterdict=False, nocolor=False):
  """formats data into a string

  Args:
    item (any): the item to format
    tab (): - DONT SET MANUALLY
    isarrafterdict (): - DONT SET MANUALLY

  Returns (str): the formatted string
  """

  class _class:
    pass

  def _func():
    pass

  def stringify(obj):
    def replace_unstringables(value):

      if type(value) in [type(_func), type(_class)]:
        return f"<{value.__name__}>"
      return value

    def convert(obj: Any):
      if isinstance(obj, dict):
        return {k: convert(v) for k, v in obj.items()}
      if isinstance(obj, list):
        return [convert(v) for v in obj]
      return replace_unstringables(obj)

    return oldjson.dumps(convert(obj))

  wrapat = 80
  tab += 2
  TYPENAME = ""
  c = (lambda x: "") if nocolor else getcolor
  try:
    # print.plain(item, tab)
    if item == True and type(item) == type(True):
      return "true"
    if item == False and type(item) == type(False):
      return "false"
    if type(item) in [type(_class), type(_func)]:
      return f'{c("RED")}<{"class" if type(item)==type(_class) else "function"} {c("BOLD")}{c("BLUE")}{item.__name__}{c("END")}{c("RED")}>{c("END")}'  # type: ignore
    if isinstance(item, str):
      return (
        c("purple")
        + '"'
        + str(item)
        # + str(item).replace("\\", "\\\\").replace('"', '\\"')
        + '"'
        + c("END")
      )
    if isinstance(item, int) or isinstance(item, float):
      item = str(item)
      reg = [r"(?<=\d)(\d{3}(?=(?:\d{3})*(?:$|\.)))", r",\g<0>"]
      if "." in item:
        return (
          c("GREEN")
          + re.sub(reg[0], reg[1], item.split(".")[0])
          + "."
          + item.split(".")[1]
          + c("END")
        )
      return c("GREEN") + re.sub(reg[0], reg[1], item) + c("END")
      # Σ╘╬╧╨╤╥╙╘╒╓╖╕╔╛╙╜╝╚╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬╭╮╯╰╱╲╳╴╵╶╷╸╹╺╻╼╽╾╿

    def name(item):
      try:
        return f'{c("pink")}╟{item.__name__}╣{c("END")}'
        # return f'{c("pink")}╟{item.__name__}╿{item.__class__.__name__}╣{c("END")}'
      except:
        return f'{c("pink")}╟{item.__class__.__name__}╣{c("END")}'

    # TYPENAME=name(item)

    if not (isinstance(item, dict) or isinstance(item, list)):
      if isinstance(item, tuple):
        TYPENAME = name(item)
      else:
        try:
          temp = [*item]
          TYPENAME = name(item)
          item = temp
        except:
          try:
            temp = {**item}  # type:ignore
            TYPENAME = name(item)
            item = temp
          except:
            pass

    if isinstance(item, dict):
      strlen = 9999999
      try:
        strlen = len(stringify(item))
      except Exception as e:
        pass
      if not len(item):
        return f'{c("orange")}{"{}"}{c("END")}'
      if strlen + tab < wrapat:
        if strlen + tab < wrapat:
          return (
            TYPENAME
            + c("orange")
            + (" " * tab if not isarrafterdict else "")
            + "{ "
            + c("END")
            + (
              f'{c("orange")},{c("END")} '.join(
                (
                  c("purple")
                  + (
                    f'"{k}"'
                    if isinstance(k, str)
                    else formatitem(k, 0)
                  )
                  + c("END")
                  + c("orange")
                  + ":"
                  + c("END")
                  + " "
                  + formatitem(v, 0, True)
                )
                for k, v in item.items()
              )
            )
            + c("orange")
            + " }"
            + c("END")
          )

      else:
        return (
          TYPENAME
          + c("orange")
          + (" " * tab if not isarrafterdict else "")
          + "{"
          + c("END")
          + "\n  "
          + (
            (c("orange") + "," + c("END") + "\n  ").join(
              (
                c("purple")
                + (" " * tab)
                + (
                  f'"{k}"'
                  if isinstance(k, str)
                  else formatitem(k, tab)
                )
                + c("END")
                + c("orange")
                + ":"
                + c("END")
                + " "
                + formatitem(v, tab, True)
              )
              for k, v in item.items()
            )
          )
          + "\n"
          + c("orange")
          + (" " * tab)
          + "}"
          + c("END")
        )

    if isinstance(item, list):
      strlen = 9999999
      try:
        strlen = len(stringify(item))
      except Exception as e:
        pass
      if not len(item):
        return f'{c("orange")}[]{c("END")}'
      if strlen + tab < wrapat:
        return (
          TYPENAME
          + c("orange")
          + ("" if isarrafterdict else " " * tab)
          + "[ "
          + c("END")
          + (
            f"{c('orange')},{c('END')} ".join(
              map(
                lambda newitem: formatitem(newitem, -2),
                item,
              )
            )
          )
          + c("orange")
          + " ]"
          + c("END")
        )
      else:
        return (
          TYPENAME
          + c("orange")
          + ("" if isarrafterdict else " " * tab)
          + "[\n"
          + c("END")
          + (
            f"{c('orange')},{c('END')}\n".join(
              map(
                lambda newitem: (
                  "  " + " " * tab
                  if isinstance(newitem, str)
                  or isinstance(newitem, int)
                  or isinstance(newitem, float)
                  else ""
                )
                + formatitem(newitem, tab),
                item,
              )
            )
          )
          + c("orange")
          + "\n"
          + " " * tab
          + "]"
          + c("END")
        )

    return " " * tab + name(item) + '"' + str(item) + '"'
    # return " " * tab + name(item) + '"' + str(item).replace('"', '\\"') + '"' #
  except Exception as e:
    print.plain(e)
    return " " * tab + f"{c('red')}{repr(item)}{c('end')}"


# print(f'changing dir to "{os.path.dirname(os.path.abspath(caller_file))}"')
# os.chdir(os.path.dirname(os.path.abspath(caller_file)))
