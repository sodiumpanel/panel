#!/bin/bash

echo "=== CHECK CVE-2024-1086 PATCH ==="
rpm -q --changelog kernel-core 2>/dev/null | grep -i "CVE-2024-1086\|nf_tables\|netfilter.*verdict" | head -10
rpm -q kernel-core 2>/dev/null

echo "=== NETLINK ACCESS FROM USERNS ==="
unshare --user --map-root-user --net -- bash -c '
  echo "Inside namespace as: $(id)"
  # Try raw netlink access
  python3 -c "
import socket
try:
    s = socket.socket(socket.AF_NETLINK, socket.SOCK_RAW, 12)
    s.bind((0, 0))
    print(\"NETLINK_NETFILTER: accessible!\")
    s.close()
except Exception as e:
    print(f\"NETLINK_NETFILTER: blocked - {e}\")
" 2>&1
' 2>&1

echo "=== OTHER KERNEL CVEs ==="
# DirtyPipe CVE-2022-0847 (kernels 5.8-5.16.11)
echo "Kernel: $(uname -r)"
# Check for other recent CVEs
rpm -q --changelog kernel-core 2>/dev/null | grep -i "CVE-202[4-6]" | head -20

echo "=== PYTHON AVAILABLE? ==="
which python3 2>/dev/null
python3 --version 2>/dev/null

echo "=== DONE ==="
