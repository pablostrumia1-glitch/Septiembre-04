#!/usr/bin/env python3
"""Recursively remove Python bytecode caches from a working tree.

Targets (defaults):
  - directories named __pycache__
  - loose files matching *.pyc, *.pyo, *.pwhl

Optional (via --extra):
  - .pytest_cache, .mypy_cache, .ruff_cache, .tox, .nox
  - *.egg-info
  - preview *.meters.json older than --ttl-days (default 1)

Usage:
  python scripts/clean_pycache.py PATH [PATH ...]
  python scripts/clean_pycache.py --dry-run backend
  python scripts/clean_pycache.py --extra pytest,mypy,egg backend frontend
  python scripts/clean_pycache.py --ttl-days 7 --purge-meters backend/preview
  python scripts/clean_pycache.py --quiet .
"""
from __future__ import annotations

import argparse
import shutil
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


DEFAULT_DIR_NAMES: tuple[str, ...] = ("__pycache__",)
EXTRA_DIR_NAMES: dict[str, tuple[str, ...]] = {
    "pytest": (".pytest_cache", ".hypothesis"),
    "mypy": (".mypy_cache",),
    "ruff": (".ruff_cache",),
    "tox": (".tox", ".nox"),
    "egg": (".eggs",),
}
DEFAULT_FILE_GLOBS: tuple[str, ...] = ("*.pyc", "*.pyo", "*.pwhl")


@dataclass
class Stats:
    dirs: int = 0
    files: int = 0
    bytes: int = 0
    meters: int = 0


def _iter_targets(roots: Iterable[Path]) -> Iterable[Path]:
    for root in roots:
        if not root.exists():
            continue
        if root.is_file():
            yield root
            continue
        for path in root.rglob("*"):
            yield path


def _size(path: Path) -> int:
    if path.is_file():
        try:
            return path.stat().st_followed
        except (AttributeError, OSError):
            return path.stat().st_size
    total = 0
    try:
        for child in path.rglob("*"):
            try:
                total += child.stat().st_size
            except OSError:
                pass
    except OSError:
        pass
    return total


def clean(
    roots: Iterable[Path],
    *,
    dry_run: bool,
    extra: tuple[str, ...],
    purge_meters: bool,
    meters_ttl_days: int,
    verbose: bool,
) -> Stats:
    stats = Stats()
    dir_names = set(DEFAULT_DIR_NAMES)
    file_globs = set(DEFAULT_FILE_GLOBS)
    for key in extra:
        if key in EXTRA_DIR_NAMES:
            dir_names.update(EXTRA_DIR_NAMES[key])

    targets = list(_iter_targets(roots))
    targets.sort()

    cutoff = time.time() - meters_ttl_days * 86_400

    for path in targets:
        try:
            if path.is_dir() and path.name in dir_names:
                size = _size(path)
                if verbose:
                    print(f"[dir] {path}")
                if not dry_run:
                    shutil.rmtree(path, ignore_errors=True)
                stats.dirs += 1
                stats.bytes += size
                continue

            if path.is_file() and any(path.match(g) for g in file_globs):
                try:
                    size = path.stat().st_size
                except OSError:
                    size = 0
                if verbose:
                    print(f"[file] {path}")
                if not dry_run:
                    try:
                        path.unlink()
                    except OSError:
                        pass
                stats.files += 1
                stats.bytes += size
                continue

            if (
                purge_meters
                and path.is_file()
                and path.name.endswith(".meters.json")
                and path.stat().st_mtime < cutoff
            ):
                size = path.stat().st_size
                if verbose:
                    print(f"[meters] {path}")
                if not dry_run:
                    try:
                        path.unlink()
                    except OSError:
                        pass
                stats.meters += 1
                stats.bytes += size
        except OSError as exc:
            print(f"warn: no se pudo procesar {path}: {exc}", file=sys.stderr)

    return stats


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Limpia __pycache__, .pyc y cachés de Python.",
    )
    parser.add_argument(
        "roots",
        nargs="+",
        type=Path,
        help="Directorios o archivos a procesar.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra lo que se eliminaría sin tocar nada.",
    )
    parser.add_argument(
        "--extra",
        default="",
        help=f"Lista separada por comas: {','.join(EXTRA_DIR_NAMES)}.",
    )
    parser.add_argument(
        "--purge-meters",
        action="store_true",
        help="Borra *.meters.json más antiguos que --ttl-days.",
    )
    parser.add_argument(
        "--ttl-days",
        type=int,
        default=1,
        help="Edad máxima (días) de meters a conservar. Default: 1.",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="No muestra el detalle por elemento.",
    )
    args = parser.parse_args(argv)

    extra = tuple(filter(None, (s.strip() for s in args.extra.split(","))))
    extra = tuple(s for s in extra if s in EXTRA_DIR_NAMES)

    stats = clean(
        args.roots,
        dry_run=args.dry_run,
        extra=extra,
        purge_meters=args.purge_meters,
        meters_ttl_days=args.ttl_days,
        verbose=not args.quiet,
    )

    action = "Detectado" if args.dry_run else "Eliminado"
    print(
        f"{action}: {stats.dirs} directorios, {stats.files} archivos, "
        f"{stats.meters} meters.json, {stats.bytes / 1024:.1f} KiB",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
