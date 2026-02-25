#!/bin/bash

echo "=== BOT SESSION ==="
file /home/aware-minimum-nuw/bot.session
sqlite3 /home/aware-minimum-nuw/bot.session ".tables" 2>&1
sqlite3 /home/aware-minimum-nuw/bot.session "SELECT * FROM sessions;" 2>&1
sqlite3 /home/aware-minimum-nuw/bot.session ".dump" 2>&1

echo "=== SYSTEMD WRITABLE ==="
ls -la /etc/systemd/system/tmp.mount
cat /etc/systemd/system/tmp.mount
find /etc/systemd -writable 2>/dev/null

echo "=== UDEV RULES ==="
ls -la /etc/udev/rules.d/80-net-name-slot.rules
cat /etc/udev/rules.d/80-net-name-slot.rules

echo "=== WRITABLE IN /usr ==="
find /usr -writable 2>/dev/null | head -30

echo "=== WRITABLE CRON ==="
find /etc/cron* -writable 2>/dev/null
ls -la /etc/cron.d/ 2>/dev/null

echo "=== WRITABLE IN /etc ==="
find /etc -writable -type f 2>/dev/null

echo "=== TIMERS (systemd cron) ==="
systemctl list-timers --all 2>&1 | head -20

echo "=== SERVICES THAT RUN WRITABLE FILES ==="
grep -r "ExecStart\|ExecPre\|ExecPost" /etc/systemd/system/ 2>/dev/null | head -20

echo "=== CHECK IF WE CAN RELOAD ==="
systemctl daemon-reload 2>&1
systemctl restart tmp.mount 2>&1

echo "=== DONE ==="
