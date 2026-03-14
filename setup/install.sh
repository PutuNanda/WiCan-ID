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
clone_cmd=(git clone --progress --depth 1 --single-branch --branch main https://github.com/PutuNanda/WiCan-ID.git "$target_dir")

run_clone() {
  if command -v script >/dev/null 2>&1; then
    # Force a pseudo-tty so git progress is always shown when piped.
    script -q -c "${clone_cmd[*]}" /dev/null
  elif command -v stdbuf >/dev/null 2>&1; then
    # Line-buffer stdout/stderr for clearer real-time output.
    stdbuf -oL -eL "${clone_cmd[@]}"
  else
    "${clone_cmd[@]}"
  fi
}

if [[ -w /dev/tty ]]; then
  run_clone &
  clone_pid=$!
  spinner='|/-\'
  i=0
  while kill -0 "$clone_pid" 2>/dev/null; do
    printf "\r[%c] Cloning..." "${spinner:i++%4:1}" > /dev/tty
    sleep 0.2
  done
  printf "\r" > /dev/tty
  wait "$clone_pid"
else
  run_clone
fi

installer="$target_dir/setup/installer-local.sh"
if [[ ! -f "$installer" ]]; then
  echo "Installer not found: $installer" >&2
  exit 1
fi

chmod +x "$installer"
bash "$installer"
