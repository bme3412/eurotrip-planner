#!/usr/bin/env python3
"""Repair malformed JSON data files left by the backfill.

Two corruption modes seen:
  1. "Extra data": a valid JSON object followed by appended garbage bytes.
     -> Truncate to the first valid JSON value (the real data), back up original.
  2. Empty file (0 bytes): cannot be repaired automatically; reported only.

Non-destructive guarantees:
  - Every modified file gets a sibling `<name>.corrupt.bak` backup.
  - Writes a full report to scripts/repair-report.txt so results survive
    even if terminal output is unavailable.
"""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "data")
ROOT = os.path.abspath(ROOT)
REPORT = os.path.join(os.path.dirname(__file__), "repair-report.txt")
APPLY = "--apply" in sys.argv

dec = json.JSONDecoder()
lines = []


def log(msg):
    lines.append(msg)


fixed, empty, ok, still_bad = 0, 0, 0, 0

for dirpath, _, files in os.walk(ROOT):
    for name in files:
        if not name.endswith(".json"):
            continue
        path = os.path.join(dirpath, name)
        rel = os.path.relpath(path, ROOT)
        raw = open(path, "r", encoding="utf-8").read()
        try:
            json.loads(raw)
            ok += 1
            continue
        except json.JSONDecodeError as e:
            pass

        if raw.strip() == "":
            empty += 1
            log(f"[EMPTY]  {rel}  (0 meaningful bytes — needs regeneration)")
            continue

        # Try to recover the first valid JSON value.
        try:
            leading = len(raw) - len(raw.lstrip())
            obj, end = dec.raw_decode(raw.lstrip())
            # Preserve the original formatting: keep the raw bytes up to the
            # end of the valid value (incl. any leading whitespace), drop only
            # the appended garbage. Re-add a single trailing newline.
            valid_text = raw[:leading + end].rstrip() + "\n"
            trailing = raw[leading + end:]
            preview = repr(trailing[:120])
            # Safety: confirm the kept text still parses before writing.
            json.loads(valid_text)
            log(f"[FIX]    {rel}")
            log(f"           kept {end} bytes of valid JSON; trimmed {len(trailing)} trailing bytes")
            log(f"           trimmed content preview: {preview}")
            if APPLY:
                with open(path + ".corrupt.bak", "w", encoding="utf-8") as b:
                    b.write(raw)
                with open(path, "w", encoding="utf-8") as f:
                    f.write(valid_text)
            fixed += 1
        except json.JSONDecodeError as e:
            still_bad += 1
            log(f"[UNREPAIRABLE] {rel}: {e}")

mode = "APPLIED" if APPLY else "DRY-RUN (re-run with --apply to write changes)"
header = [
    f"JSON repair report — mode: {mode}",
    f"scanned root: {ROOT}",
    f"ok={ok}  to-fix={fixed}  empty={empty}  unrepairable={still_bad}",
    "",
]
out = "\n".join(header + lines) + "\n"
open(REPORT, "w", encoding="utf-8").write(out)
print(out)
