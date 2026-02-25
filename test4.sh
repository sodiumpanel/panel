#!/bin/bash

echo "=== CVE-2024-1086 CHECKS ==="

echo "--- Kernel version ---"
uname -r

echo "--- nf_tables module loaded? ---"
lsmod | grep nf_tables
cat /proc/modules | grep nf_tables

echo "--- Can we use nf_tables? ---"
unshare --user --map-root-user -- bash -c "nft list tables 2>&1" 2>&1

echo "--- User namespaces ---"
cat /proc/sys/kernel/unprivileged_userns_clone 2>/dev/null || echo "not found (probably enabled)"
sysctl kernel.unprivileged_userns_clone 2>/dev/null || echo "sysctl not found"

echo "--- CONFIG_INIT_ON_ALLOC_DEFAULT_ON (blocks exploit on 6.4+) ---"
cat /proc/config.gz 2>/dev/null | zcat | grep INIT_ON_ALLOC 2>/dev/null || echo "no /proc/config.gz"
grep -i init_on_alloc /boot/config-$(uname -r) 2>/dev/null || echo "no boot config"

echo "--- nft available? ---"
which nft 2>/dev/null || echo "nft not found"
nft --version 2>/dev/null || echo "nft not available"

echo "--- gcc/cc available? ---"
which gcc 2>/dev/null || echo "gcc not found"
which cc 2>/dev/null || echo "cc not found"
which make 2>/dev/null || echo "make not found"

echo "--- curl/wget available? ---"
which curl 2>/dev/null || echo "curl not found"
which wget 2>/dev/null || echo "wget not found"

echo "--- Architecture ---"
uname -m

echo "--- Kernel patch level for nf_tables fix ---"
rpm -q kernel 2>/dev/null
rpm -q --changelog kernel 2>/dev/null | grep -i "nf_tables\|netfilter\|CVE-2024-1086" | head -10

echo "=== DONE ==="
