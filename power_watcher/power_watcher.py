#!/usr/bin/env python3
"""
power_watcher_with_remote_shutdown.py

Sama seperti versi sebelumnya, tapi menambahkan kemampuan untuk:
- Jika Firebase key untuk host remote berubah ke False, master akan mencoba
  melakukan shutdown remote machine (menggunakan shutdown /m \\HOST di Windows
  atau ssh user@host sudo shutdown -h now di sistem berbasis Unix).

Requirements:
  pip install wakeonlan requests
Usage:
  - Pastikan Firebase Realtime DB rules sudah sesuai (read/write true) jika tanpa auth
  - Sesuaikan DATABASE_URL dan TARGETS (tambahkan 'host' bila ingin pakai IP)
  - Jalankan di mesin master
"""

import os
import time
import logging
import platform
import subprocess
import requests
from wakeonlan import send_magic_packet

# ---------------- CONFIG ----------------
DATABASE_URL = "https://power-pc-man4-64b22-default-rtdb.asia-southeast1.firebasedatabase.app/"
DB_NODE = "power"

# TARGETS: key = nama di Firebase; isi: mac, broadcast, (optional) host, (optional) ssh_user
TARGETS = {
    "DESKTOP-UH5P3A3": {"mac": "04:42:1A:2D:B6:7A", "broadcast": "192.168.100.255", "host": "192.168.100.11"},
    "pc_target":       {"mac": "B4:2E:99:53:9B:F5", "broadcast": "192.168.100.255", "host": "192.168.100.12"},
    "master-pc":       {"mac": "A8:A1:59:62:3F:B9", "broadcast": "192.168.100.255", "host": "192.168.100.10"},

    "DESKTOP-6L34PHK": {"mac": "B4:2E:99:53:9B:F5", "broadcast": "192.168.100.255", "host": "DESKTOP-6L34PHK"},
    "DESKTOP-NBIBKJ7": {"mac": "A8:A1:59:62:3F:B9", "broadcast": "192.168.100.255", "host": "DESKTOP-NBIBKJ7"},
}

POLL_INTERVAL = 5
LOG_FILE = None
# ----------------------------------------

# Setup logging
log_handlers = [logging.StreamHandler()]
if LOG_FILE:
    log_handlers.append(logging.FileHandler(LOG_FILE))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=log_handlers,
)

LOCAL_HOSTNAME = platform.node()
DATABASE_URL = DATABASE_URL.rstrip('/')

# ------------ HTTP helpers ------------
def http_get(path):
    url = f"{DATABASE_URL}/{path}.json"
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()

def http_put(path, payload):
    url = f"{DATABASE_URL}/{path}.json"
    resp = requests.put(url, json=payload, timeout=10)
    resp.raise_for_status()
    return resp.json()

def http_patch(path, payload):
    url = f"{DATABASE_URL}/{path}.json"
    resp = requests.patch(url, json=payload, timeout=10)
    resp.raise_for_status()
    return resp.json()

# ------------ ensure/defaults ------------
def ensure_power_node_and_defaults():
    try:
        data = http_get(DB_NODE)
        if data is None:
            default = {name: False for name in TARGETS.keys()}
            if LOCAL_HOSTNAME not in default:
                default[LOCAL_HOSTNAME] = False
            default[LOCAL_HOSTNAME] = True
            http_put(DB_NODE, default)
            logging.info("Created default /%s in Firebase: %s", DB_NODE, default)
            return default
        else:
            if LOCAL_HOSTNAME not in data:
                http_patch(DB_NODE, {LOCAL_HOSTNAME: True})
                logging.info("Added %s=True to existing /%s", LOCAL_HOSTNAME, DB_NODE)
                data[LOCAL_HOSTNAME] = True
            else:
                if data.get(LOCAL_HOSTNAME) is not True:
                    http_patch(DB_NODE, {LOCAL_HOSTNAME: True})
                    logging.info("Set %s=True in /%s (agent started)", LOCAL_HOSTNAME, DB_NODE)
                    data[LOCAL_HOSTNAME] = True
            return data
    except Exception as e:
        logging.exception("Failed to ensure power node/defaults: %s", e)
        return {}

def get_power_state():
    try:
        data = http_get(DB_NODE)
        return data or {}
    except Exception as e:
        logging.error("Gagal ambil data Firebase: %s", e)
        return {}

# ------------ WOL ------------
def send_wol_to(mac, broadcast_ip=None):
    if not mac:
        logging.warning("MAC address kosong, skip WOL")
        return
    try:
        if broadcast_ip:
            send_magic_packet(mac, ip_address=broadcast_ip)
        else:
            send_magic_packet(mac)
        logging.info("Sent WOL to %s (broadcast %s)", mac, broadcast_ip)
    except Exception as e:
        logging.exception("Failed to send WOL to %s: %s", mac, e)

# ------------ Shutdown helpers ------------
def shutdown_local(delay=5):
    logging.info("Shutting down local machine in %s seconds...", delay)
    try:
        if os.name == "nt":
            os.system(f"shutdown /s /t {int(delay)}")
        else:
            # on Unix, use sudo if needed
            subprocess.run(["sudo", "shutdown", "-h", "now"])
    except Exception as e:
        logging.exception("Shutdown command failed: %s", e)

def remote_shutdown_windows(host_identifier, delay=5):
    """
    Try to shutdown remote Windows host using built-in shutdown command.
    host_identifier can be hostname or IP. This requires:
      - admin credential on target (the current user or impersonation)
      - firewall rules / Remote RPC allowed on target
    """
    try:
        # use the Windows shutdown command: shutdown /s /m \\HOST /t DELAY
        cmd = ["shutdown", "/s", "/m", f"\\\\{host_identifier}", "/t", str(int(delay))]
        logging.info("Attempting remote shutdown (Windows) with: %s", " ".join(cmd))
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if proc.returncode == 0:
            logging.info("Remote shutdown command sent to %s", host_identifier)
        else:
            logging.error("Remote shutdown failed for %s: rc=%s stdout=%s stderr=%s",
                          host_identifier, proc.returncode, proc.stdout.strip(), proc.stderr.strip())
    except FileNotFoundError:
        logging.error("Local 'shutdown' command not found (not a Windows master?)")
    except Exception as e:
        logging.exception("Exception during remote_shutdown_windows: %s", e)

def remote_shutdown_via_ssh(host_identifier, ssh_user=None):
    """
    Try to shutdown remote host via SSH:
      - ssh_user@host 'sudo shutdown -h now'
    Requires passwordless key or other auth configured.
    """
    if not ssh_user:
        logging.error("SSH user not provided for host %s; cannot SSH shutdown.", host_identifier)
        return
    try:
        ssh_target = f"{ssh_user}@{host_identifier}"
        cmd = ["ssh", "-o", "BatchMode=yes", ssh_target, "sudo", "shutdown", "-h", "now"]
        logging.info("Attempting remote shutdown via SSH: %s", " ".join(cmd))
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if proc.returncode == 0:
            logging.info("SSH shutdown command succeeded for %s", host_identifier)
        else:
            logging.error("SSH shutdown failed for %s: rc=%s stdout=%s stderr=%s",
                          host_identifier, proc.returncode, proc.stdout.strip(), proc.stderr.strip())
    except Exception as e:
        logging.exception("Exception during remote_shutdown_via_ssh: %s", e)

# ------------ Main loop ------------
def main_loop():
    ensure_power_node_and_defaults()

    prev_state = {}
    logging.info("Start watching Firebase node '%s' as host '%s'", DB_NODE, LOCAL_HOSTNAME)

    while True:
        data = get_power_state()
        if not isinstance(data, dict):
            logging.warning("Unexpected DB data type: %s", type(data))
            time.sleep(POLL_INTERVAL)
            continue

        for name, value in data.items():
            prev = prev_state.get(name)
            if value != prev:
                logging.info("State change detected: %s : %s -> %s", name, prev, value)

                # nilai True -> WOL
                if value is True or value == "true" or value == 1:
                    tgt = TARGETS.get(name)
                    if tgt:
                        send_wol_to(tgt.get("mac"), tgt.get("broadcast"))
                    else:
                        logging.warning("No TARGET mapping for '%s' -> skip WOL", name)

                # nilai False -> shutdown (lokal atau remote)
                elif value is False or value == "false" or value == 0:
                    # shutdown lokal jika nama cocok
                    if name.lower() == LOCAL_HOSTNAME.lower():
                        logging.info("Firebase requested shutdown for this host (%s).", LOCAL_HOSTNAME)
                        shutdown_local(delay=5)
                    else:
                        # nama remote: coba remote shutdown jika mapping ada
                        tgt = TARGETS.get(name)
                        if not tgt:
                            logging.info("Received False for %s — no TARGET mapping (skip remote shutdown).", name)
                        else:
                            remote_host = tgt.get("host") or name
                            # jika master system Windows, gunakan shutdown /m
                            if os.name == "nt":
                                logging.info("Master is Windows — attempting remote shutdown for %s", remote_host)
                                remote_shutdown_windows(remote_host, delay=5)
                            else:
                                # non-windows master, try SSH (needs tgt to have ssh_user)
                                ssh_user = tgt.get("ssh_user")
                                if ssh_user:
                                    logging.info("Master is Unix-like — attempting SSH shutdown for %s (user=%s)",
                                                 remote_host, ssh_user)
                                    remote_shutdown_via_ssh(remote_host, ssh_user)
                                else:
                                    logging.info("No ssh_user for %s — cannot perform SSH shutdown. Provide 'ssh_user' in TARGETS or run script from Windows master.", remote_host)

                else:
                    logging.info("Unsupported value type for %s: %s", name, type(value))

                prev_state[name] = value

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    try:
        main_loop()
    except KeyboardInterrupt:
        logging.info("Interrupted by user, exiting.")
    except Exception:
        logging.exception("Fatal error, exiting.")
        raise
