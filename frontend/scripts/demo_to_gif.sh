#!/usr/bin/env bash
set -euo pipefail

output_dir="/tmp/retirement-planner"
mkdir -p "$output_dir"

video_path=$(node scripts/demo.mjs)

if [[ -z "$video_path" ]]; then
  echo "No video path returned from demo script." >&2
  exit 1
fi

output_gif="../docs/demo.gif"

ffmpeg -y -i "$video_path" -vf "fps=12,scale=1200:-1:flags=lanczos" -c:v gif "$output_gif"

rm -f "$video_path"

if [[ -d "$output_dir" ]]; then
  rmdir "$output_dir" 2>/dev/null || true
fi

echo "Wrote $output_gif"
