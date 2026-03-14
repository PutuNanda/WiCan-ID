#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Uninstall must be run with sudo." >&2
  exit 1
fi

echo "Are you sure you want to uninstall WiCan? This action cannot be undone and may remove all previously registered device data."
read -r -p "Type yes to continue: " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Uninstall cancelled."
  exit 0
fi

systemctl disable --now wican-id.service >/dev/null 2>&1 || true
rm -f /etc/systemd/system/wican-id.service
rm -f /etc/systemd/system/multi-user.target.wants/wican-id.service
systemctl daemon-reload

rm -f /usr/local/sbin/wican-id
rm -rf /opt/wican-id

echo "WiCan has been uninstalled."
