#!/bin/bash
echo "=== SYSTEM INFO ==="
uname -a
cat /etc/os-release

echo "=== CURRENT USER ==="
id
whoami

echo "=== KERNEL ==="
uname -r

echo "=== SUID FILE ==="
file /etc/yum.repos.d/virtualmin.repo
ls -la /etc/yum.repos.d/virtualmin.repo
cat /etc/yum.repos.d/virtualmin.repo

echo "=== STAPRUN ==="
ls -la /usr/bin/staprun
staprun --version 2>&1 || true

echo "=== PKEXEC ==="
pkexec --version 2>&1 || true

echo "=== USER NAMESPACES ==="
unshare --user --map-root-user id 2>&1 || true
cat /proc/sys/kernel/unprivileged_userns_clone 2>/dev/null || true

echo "=== CRONTAB ==="
cat /etc/crontab 2>/dev/null
ls -la /var/spool/cron/ 2>/dev/null

echo "=== WRITABLE DIRS ==="
find /tmp /var/tmp /dev/shm -writable -type d 2>/dev/null | head -10

echo "=== ENV FILES ==="
find /home -readable -name ".env" 2>/dev/null | head -20

echo "=== CONFIG FILES ==="
find /home -readable -name "wp-config.php" 2>/dev/null | head -10
find /home -readable -name "config.php" 2>/dev/null | head -10

echo "=== PASSWD (shells) ==="
grep -v "nologin\|false" /etc/passwd

echo "=== BASH HISTORY ==="
cat ~/.bash_history 2>/dev/null | tail -30

echo "=== READABLE HOME DIRS ==="
ls -la /home/ 2>/dev/null | head -30

echo "=== INTERESTING PROCESSES ==="
ps aux | grep -i "root" | grep -v "\[" | head -20

echo "=== NETWORK ==="
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null

echo "=== DOCKER/LXC ==="
docker ps 2>/dev/null
cat /proc/1/cgroup 2>/dev/null | head -5

echo "=== DONE ==="
