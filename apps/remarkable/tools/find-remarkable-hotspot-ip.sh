#!/usr/bin/env bash
# Repoint an ssh-config host at the reMarkable, wherever the network you are on
# has just leased it. Identification is by SSH host key: the device keeps its
# key across leases, so a fingerprint already in known_hosts under one of your
# remarkable hosts is proof rather than a guess. Connecting once on the new
# address files the key under that address too, so the proof carries forward.
#
# Usage: find-remarkable-hotspot-ip.sh [ssh-config-host]  (default: remarkable-hotspot)
set -eu

host_alias=${1:-remarkable-hotspot}
ssh_config=${SSH_CONFIG:-$HOME/.ssh/config}
known_hosts=${KNOWN_HOSTS:-$HOME/.ssh/known_hosts}

die() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

known_fingerprints() {
    ssh-keygen -F "$1" -f "$known_hosts" 2>/dev/null |
        grep -v '^#' | ssh-keygen -lf - 2>/dev/null | awk '{ print $2 }'
}

matches_reference() {
    [[ -n $1 ]] && grep -qxF -f <(printf '%s\n' "$1") <<<"$reference_keys"
}

command -v nmap >/dev/null || die "nmap is required — install it (pacman -S nmap)"

# Every key known_hosts holds for an address a remarkable host block has pointed
# at. Scanned hosts are matched against these.
reference_keys=$(
    awk 'tolower($1) == "host" { is_remarkable = tolower($0) ~ /remarkable/ }
         is_remarkable && tolower($1) == "hostname" { print $2 }' "$ssh_config" |
        sort -u | while read -r name; do known_fingerprints "$name"; done
)
[[ -n $reference_keys ]] ||
    die "known_hosts holds no key for any remarkable host — ssh to it once on a known address first"

interface=$(ip route show default | awk '{ for (i = 1; i < NF; i++) if ($i == "dev") print $(i + 1) }')
[[ -n $interface ]] || die "no default route"
network=$(ip -4 -oneline addr show dev "$interface" scope global | awk '{ print $4; exit }')

# Only root gets ARP discovery. Unprivileged, nmap -sn degrades to a TCP connect
# sweep, and the tablet answers on no port but 22 — so it stays invisible.
scan_addresses() {
    if [[ $(id -u) -ne 0 ]] && command -v sudo >/dev/null; then
        sudo nmap -sn -n "$1"
    else
        nmap -sn -n "$1"
    fi | awk '/^Nmap scan report for/ { print $NF }'
}

printf 'Scanning %s …\n' "$network" >&2
matched=()
for address in $(scan_addresses "$network"); do
    keys=$(ssh-keyscan -T 2 "$address" 2>/dev/null | ssh-keygen -lf - 2>/dev/null | awk '{ print $2 }') || keys=""
    label=${keys:+ssh}
    if matches_reference "$keys"; then
        matched+=("$address")
        label="<- reMarkable"
    fi
    printf '  %-15s %s\n' "$address" "$label" >&2
done

# Two matches means known_hosts is vouching for a recycled address, so neither
# is trustworthy — better to say so than to guess.
((${#matched[@]} != 0)) ||
    die "no host key on $network matched a known reMarkable — is the tablet awake and on this network?"
((${#matched[@]} == 1)) ||
    die "${matched[*]} all matched — known_hosts still holds a key for an address that changed hands; drop the wrong one with ssh-keygen -R"
device=${matched[0]}

staged=$(mktemp)
awk -v alias="$host_alias" -v address="$device" '
    tolower($1) == "host" { in_block = 0; for (i = 2; i <= NF; i++) if (tolower($i) == tolower(alias)) in_block = 1 }
    in_block && tolower($1) == "hostname" {
        match($0, /^[ \t]*/)
        print substr($0, 1, RLENGTH) "Hostname " address
        in_block = 0
        found = 1
        next
    }
    { print }
    END { if (!found) exit 3 }
' "$ssh_config" >"$staged" ||
    die "no 'Host $host_alias' block with a Hostname line in $ssh_config"

cp -p "$ssh_config" "$ssh_config.bak"
cat "$staged" >"$ssh_config"
rm -f "$staged"
printf '%s -> %s   (previous config saved as %s.bak)\n' "$host_alias" "$device" "$ssh_config"

# A recycled lease leaves whoever held this address in known_hosts, and ssh
# refuses to connect until that entry is gone.
stale_keys=$(known_fingerprints "$device")
if [[ -n $stale_keys ]] && ! matches_reference "$stale_keys"; then
    printf 'known_hosts has a stale key for %s — clear it:  ssh-keygen -R %s\n' "$device" "$device"
fi
