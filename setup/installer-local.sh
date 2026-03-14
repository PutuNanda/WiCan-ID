#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Please run as root (use sudo)." >&2
  exit 1
fi

install_user="${SUDO_USER:-}"
if [[ -z "$install_user" ]]; then
  install_user="$(logname 2>/dev/null || true)"
fi
if [[ -z "$install_user" ]]; then
  install_user="$(awk -F: '$3>=1000 && $1!="nobody"{print $1; exit}' /etc/passwd)"
fi

if command -v node >/dev/null 2>&1; then
  echo "Node.js detected."
else
  echo "Node.js not found, installing..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y ca-certificates curl
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
  elif command -v yum >/dev/null 2>&1; then
    yum install -y ca-certificates curl
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  elif command -v pacman >/dev/null 2>&1; then
    pacman -Sy --noconfirm nodejs npm
  else
    echo "Unsupported package manager. Please install Node.js manually." >&2
    exit 1
  fi
fi

config_file="/opt/wican-id/wican-id/database/server-config/wican-global-config.properties"
if [[ ! -f "$config_file" ]]; then
  echo "Config file not found: $config_file" >&2
  exit 1
fi

if [[ ! -r /dev/tty ]]; then
  echo "Interactive input required, but no TTY available." >&2
  exit 1
fi

get_prop() {
  local key="$1"
  local val
  val="$(grep -m1 "^${key}=" "$config_file" | cut -d'=' -f2-)"
  printf "%s" "$val"
}

set_prop() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$config_file"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$config_file"
  else
    echo "${key}=${val}" >> "$config_file"
  fi
}

prompt_optional() {
  local label="$1"
  local key="$2"
  local current
  local input
  current="$(get_prop "$key")"
  read -r -p "${label} (default ${current}): " input < /dev/tty
  if [[ -n "$input" ]]; then
    set_prop "$key" "$input"
  fi
}

prompt_required() {
  local label="$1"
  local key="$2"
  local input=""
  while [[ -z "$input" ]]; do
    read -r -p "${label} (required): " input < /dev/tty
  done
  set_prop "$key" "$input"
}

prompt_optional "Server web port" "Server-Web-Port"
prompt_optional "Server web listen" "Server-Web-Listen"
prompt_optional "Server node port" "Server-Node-Port"
prompt_optional "Server node listen" "Server-Node-Listen"
prompt_required "Server IP" "server-ip"
prompt_required "Default WiFi SSID" "default-wifi-ssid"
prompt_required "Default WiFi password" "default-wifi-password"
prompt_optional "Node port" "node-port"

arduino_cli="/opt/wican-id/wican-id/mcu-tools/arduino-cli/arduino-cli"
if [[ -f "$arduino_cli" ]]; then
  chmod +x "$arduino_cli"
else
  echo "Warning: arduino-cli not found at $arduino_cli" >&2
fi

chmod +x /opt/wican-id/setup/*.sh 2>/dev/null || true

mkdir -p /opt/wican-id/wican-id/service
mkdir -p /opt/wican-id/wican-id/database

cat >/usr/local/sbin/wican-id <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-}"
case "$cmd" in
  repair|update|uninstall)
    exec "/opt/wican-id/setup/${cmd}.sh"
    ;;
  *)
    echo "Usage: wican-id {repair|update|uninstall}" >&2
    exit 1
    ;;
esac
EOF
chmod +x /usr/local/sbin/wican-id

cat >/etc/systemd/system/wican-id.service <<EOF
[Unit]
Description=WiCan-ID Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/wican-id/wican-id
ExecStart=/usr/bin/node /opt/wican-id/wican-id/server.js
Restart=always
RestartSec=3
${install_user:+User=$install_user}

[Install]
WantedBy=multi-user.target
EOF

if [[ -n "$install_user" ]] && id "$install_user" >/dev/null 2>&1; then
  chown -R "$install_user:$install_user" /opt/wican-id
else
  echo "Warning: could not determine install user for ownership change." >&2
fi

app_dir="/opt/wican-id/wican-id"
if [[ -d "$app_dir" ]]; then
  if [[ -n "$install_user" ]] && id "$install_user" >/dev/null 2>&1; then
    sudo -u "$install_user" bash -c "cd '$app_dir' && npm install"
  else
    (cd "$app_dir" && npm install)
  fi
else
  echo "Warning: app directory not found at $app_dir" >&2
fi

systemctl daemon-reload
systemctl enable --now wican-id.service
systemctl restart wican-id.service

cat <<'EOF'
__        _   _____
\ \      / | |  ___|
 \ \ /\ / /  | |_   
  \ V  V /   |  _|  
   \_/\_/    |_|    

Installation is done.
EOF
