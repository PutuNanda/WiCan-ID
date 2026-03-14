#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Please run as root (use sudo)." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required but not found in PATH." >&2
  exit 1
fi

target_dir="/opt/wican-id"

if [[ -e "$target_dir" ]]; then
  echo "Target path already exists: $target_dir" >&2
  echo "Please remove it first if you want a fresh clone." >&2
  exit 1
fi

mkdir -p "$target_dir"
git clone --progress --depth 1 --single-branch --branch main https://github.com/PutuNanda/WiCan-ID.git "$target_dir"

installer="$target_dir/setup/installer-local.sh"
if [[ ! -f "$installer" ]]; then
  echo "Installer not found: $installer" >&2
  exit 1
fi

chmod +x "$installer"
bash "$installer"
