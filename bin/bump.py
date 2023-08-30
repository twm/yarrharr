#!/usr/bin/python3
# Copyright © 2023 Tom Most <twm@freecog.net>

import argparse
import asyncio
import shlex
from pathlib import Path
from typing import Sequence

repo_root = Path(__file__).parent.parent

_parser = argparse.ArgumentParser()
_parser.add_argument("-P", "--upgrade-package", dest="packages", nargs="*")


async def _run(args: Sequence[str]) -> None:
    """
    Run a command. Raise an exception if it exits non-zero.
    """
    proc = await asyncio.create_subprocess_exec(*args)
    await proc.wait()
    if proc.returncode != 0:
        raise Exception(f"{' '.join(shlex.quote(a) for a in args)} exited {proc.returncode}")


def _requirements() -> list[tuple[str, str]]:
    for req in repo_root.glob("requirements*.txt"):
        with req.open("r") as f:
            for line in f:
                if line.startswith((" ", "#")):
                    continue
                if (i := line.find("==")) == -1:
                    continue
                yield line[:i], line[i + 2 :]


def _list_packages() -> list[str]:
    return sorted({dist for dist, _ in _requirements()})


def _list_versions(dist: str) -> list[str]:
    return sorted({v for d, v in _requirements() if d == dist})


async def _main(packages: list[str]) -> None:
    if not packages:
        packages = _list_packages()

    for package in sorted(set(packages)):
        print(f"Attempting bump of {package}")
        await _run(["tox", "-e", "deps", "--", "--upgrade-package", package])
        proc = await asyncio.create_subprocess_exec("git", "diff", "--exit-code")
        await proc.wait()
        if proc.returncode == 0:
            continue
        versions = _list_versions(package)
        msg = f"{package} {' '.join(versions)}"
        print(msg)
        await _run(["git", "commit", "-am", msg])


def main():
    args = _parser.parse_args()
    asyncio.run(_main(args.packages))


if __name__ == "__main__":
    main()
