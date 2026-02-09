#!/usr/bin/env bash
# Clear Xcode DerivedData for Trace to fix phantom BuildFile / missing target GUID errors.
# Run with: ./clear-xcode-cache.sh
# Then reopen Trace.xcodeproj in Xcode.

set -e
DERIVED=~/Library/Developer/Xcode/DerivedData
if [[ ! -d "$DERIVED" ]]; then
  echo "DerivedData not found; nothing to clear."
  exit 0
fi
# Remove any DerivedData entries that match Trace (project or app name)
shopt -s nullglob
for d in "$DERIVED"/*Trace*; do
  echo "Removing: $d"
  rm -rf "$d"
done
echo "Done. Reopen Trace.xcodeproj and build again."
