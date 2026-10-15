#!/usr/bin/env bash
# Re-encode the descent film so it scrubs smoothly with scroll: short GOP, no
# B-frames, no audio, 1080p, fast start. Usage: scripts/prepare-video.sh in.mp4
set -euo pipefail
in="${1:?usage: scripts/prepare-video.sh <input video>}"
out="$(dirname "$0")/../public/media/descent.mp4"
ffmpeg -y -i "$in" -an \
  -vf "scale=1920:-2:flags=lanczos,fps=30" \
  -c:v libx264 -preset slow -crf 21 -g 4 -keyint_min 4 -bf 0 \
  -pix_fmt yuv420p -movflags +faststart "$out"
echo "wrote $out"
