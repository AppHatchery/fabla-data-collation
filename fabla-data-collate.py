#!/usr/bin/env python3
"""
Collate many CSVs -> one CSV (deduped).

Examples:
  # Merge every CSV in a folder (non-recursive)
  python collate_csvs.py -i ./my_csvs -o merged.csv

  # Merge recursively
  python collate_csvs.py -i ./my_csvs --recursive -o merged.csv

  # Merge specific files/globs
  python collate_csvs.py -i data/*.csv extra.csv -o merged.csv

  # Deduplicate on a subset of columns
  python collate_csvs.py -i ./my_csvs -o merged.csv --dedup-cols id email --keep first
"""
import argparse
import sys
from pathlib import Path
import pandas as pd

def find_csvs(inputs, pattern="*.csv", recursive=False):
    files = []
    for inp in inputs:
        p = Path(inp)
        if p.is_dir():
            globber = p.rglob if recursive else p.glob
            files.extend([f for f in globber(pattern) if f.is_file()])
        elif p.is_file():
            if p.suffix.lower() == ".csv":
                files.append(p)
        else:
            # treat as glob expression
            files.extend([f for f in Path().glob(inp) if f.is_file() and f.suffix.lower() == ".csv"])
    # unique while preserving order
    seen = set()
    out = []
    for f in files:
        if f not in seen:
            out.append(f)
            seen.add(f)
    return out

def main():
    ap = argparse.ArgumentParser(description="Collate CSVs, drop duplicates, and write a single CSV.")
    ap.add_argument("-i", "--input", nargs="+", required=True,
                    help="Input dir(s), file(s), or glob(s).")
    ap.add_argument("-o", "--output", default="merged.csv",
                    help="Output CSV path (e.g., merged.csv or merged.csv.gz).")
    ap.add_argument("--pattern", default="*.csv",
                    help="When an input is a directory, match files with this pattern (default: *.csv).")
    ap.add_argument("--recursive", action="store_true",
                    help="Recurse into subdirectories when inputs include directories.")
    ap.add_argument("--sep", default=",",
                    help="Field delimiter (default: ,).")
    ap.add_argument("--encoding", default="utf-8-sig",
                    help="CSV encoding for reading (default: utf-8-sig).")
    ap.add_argument("--dedup-cols", nargs="*", default=["ResponseID"],
                    help="Column names to deduplicate on. Default: ResponseID.")
    ap.add_argument("--keep", choices=["first", "last"], default="first",
                    help="Which duplicate to keep (default: first).")
    ap.add_argument("--quiet", action="store_true",
                    help="Reduce logging.")
    args = ap.parse_args()

    files = find_csvs(args.input, pattern=args.pattern, recursive=args.recursive)
    if not files:
        print("No CSVs found. Check your inputs/pattern.", file=sys.stderr)
        sys.exit(2)

    if not args.quiet:
        print(f"Found {len(files)} CSV file(s). Reading...")

    # Read as text to avoid dtype conflicts across different CSVs
    dfs = []
    total_rows = 0
    for f in files:
        try:
            df = pd.read_csv(
                f,
                sep=args.sep,
                dtype=str,              # read everything as string
                keep_default_na=False,  # keep 'NA', 'null' as literal text
                na_filter=False,        # do not convert to NaN
                encoding=args.encoding,
                low_memory=False
            )
            dfs.append(df)
            total_rows += len(df)
            if not args.quiet:
                print(f"  Loaded {f} ({len(df)} rows, {len(df.columns)} cols)")
        except Exception as e:
            print(f"  Skipped {f} due to error: {e}", file=sys.stderr)

    if not dfs:
        print("No readable CSVs loaded.", file=sys.stderr)
        sys.exit(3)

    # Concatenate (union of columns is automatic; missing values become empty strings because na_filter=False)
    if not args.quiet:
        print("Concatenating...")
    merged = pd.concat(dfs, ignore_index=True)

    # Standardize column order: keep dedup keys first (if provided), then others in first-seen order
    first_seen_cols = []
    seen = set()
    for df in dfs:
        for c in df.columns:
            if c not in seen:
                first_seen_cols.append(c)
                seen.add(c)

    if args.dedup_cols:
        # ensure dedup columns exist (create empty if missing)
        for c in args.dedup_cols:
            if c not in merged.columns:
                merged[c] = ""
        # column order with dedup cols first
        other_cols = [c for c in first_seen_cols if c not in args.dedup_cols]
        col_order = list(dict.fromkeys(args.dedup_cols + other_cols + [c for c in merged.columns if c not in first_seen_cols]))
        merged = merged[col_order]

    # Drop duplicates
    before = len(merged)
    merged = merged.drop_duplicates(subset=args.dedup_cols, keep=args.keep, ignore_index=True)
    after = len(merged)

    if not args.quiet:
        removed = before - after
        print(f"Deduplicated: {removed} duplicate row(s) removed. Final rows: {after} (from {total_rows}).")

    # Write output (compression inferred from extension)
    if not args.quiet:
        print(f"Writing {args.output} ...")
    merged.to_csv(args.output, index=False, encoding="utf-8")

    if not args.quiet:
        print("Done.")

if __name__ == "__main__":
    main()