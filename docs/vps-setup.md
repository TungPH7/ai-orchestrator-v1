# Cài VPS cho ai-orchestrator

Hướng dẫn này thuộc module `release-workflow` ([SPEC-release-workflow.md](../SPEC-release-workflow.md), mục 2.3 và 2.11). Một VPS chạy cả ba môi trường của mọi dự án dùng kit. Các bước dưới đây là đúng các lệnh đã chạy trên VPS của kit, theo thứ tự, để cài lại được từ đầu.

- Chỉ phiên chính của Claude dùng SSH vào VPS, khi bạn yêu cầu. Agent của kit không bao giờ SSH.
- Key, mật khẩu và token không bao giờ đi qua chat, repo hay log. Bạn tự gõ chúng trong terminal của bạn.
- Phần cài deployer nằm ở mục "Cài deployer" (T9 của plan, chưa viết).

**VPS của kit:** BKNS, gói VPS MMO4, IP `42.96.4.120`, cổng SSH `26266`, hostname `vps.ao.t2g.io.vn`, Ubuntu 24.04. Host key ED25519: `SHA256:nxU5j2RoNi+ffPow22zT35H+4F/Kthn/Tmnpi79V1ko`.

## 1. Tạo key SSH (bạn làm)

Trong PowerShell của bạn:

```
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\ao_vps" -C "ao-vps"
ssh-add "$env:USERPROFILE\.ssh\ao_vps"
Get-Content "$env:USERPROFILE\.ssh\ao_vps.pub" | Set-Clipboard
```

- Passphrase mạnh: ít nhất 16 ký tự, hoặc 4–5 từ ngẫu nhiên. Lưu trong trình quản lý mật khẩu.
- Dịch vụ ssh-agent của Windows phải đang chạy. Claude dùng `C:\Windows\System32\OpenSSH\ssh.exe`, vì `ssh` của Git Bash không dùng agent đó.
- Cài xong mỗi đợt, bạn gỡ key khỏi agent: `ssh-add -d "$env:USERPROFILE\.ssh\ao_vps"`. Lần sau cần sửa VPS thì nạp lại.

## 2. Thuê VPS (bạn làm)

Cần: Ubuntu 24.04, 2 vCPU, 4 GB RAM, ít nhất 40 GB SSD, một IPv4. Với BKNS:

1. Đăng nhập `my.bkns.net`, mở trang VPS giá rẻ, bấm **Đăng ký dịch vụ** dưới gói VPS MMO4.
2. **Chu kì thanh toán:** `01 tháng` hoặc dài hơn.
3. **Tên miền/ Hostname:** `vps.ao.t2g.io.vn`.
4. **Hệ điều hành:** `Ubuntu-24-x64`. Không chọn `Ubuntu24-Remote-XFCE`, `aaPanel-…`, `Cyberpanel-…` hay bản "Đã lỗi thời".
5. **Thêm SSH Key mới:** dán public key ở mục 1.
6. **Snapshots:** tùy bạn. RAM, CPU, đĩa, IP giữ mức thấp nhất của gói.
7. Bấm **Tiếp tục**, thanh toán.
8. Email của BKNS ghi IP, cổng SSH và mật khẩu root. Chỉ gửi Claude IP và cổng.

## 3. Đăng nhập lần đầu, tắt đăng nhập bằng mật khẩu

Claude đăng nhập bằng key, với agent của Windows:

```
ssh.exe -p 26266 -o IdentitiesOnly=yes -i "C:\Users\Huu Tung\.ssh\ao_vps.pub" root@42.96.4.120
```

Việc đầu tiên trên VPS: tắt đăng nhập bằng mật khẩu. Ubuntu 24.04 đọc `/etc/ssh/sshd_config.d/*.conf` ở đầu `sshd_config`, và giá trị đọc trước thắng, nên file mang tên `00-…` thắng mọi file khác:

```
cat > /etc/ssh/sshd_config.d/00-ao-hardening.conf <<'EOF'
# ai-orchestrator (docs/vps-setup.md): key-only SSH. Root may log in with a key only until the setup ends.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t && systemctl restart ssh
sshd -T | grep -Ei '^(passwordauthentication|permitrootlogin|kbdinteractiveauthentication) '
```

**Kiểm từ máy bạn:** đăng nhập bằng mật khẩu bị từ chối.

```
ssh.exe -p 26266 -o PubkeyAuthentication=no -o PreferredAuthentications=password,keyboard-interactive root@42.96.4.120
# root@42.96.4.120: Permission denied (publickey).
```

## 4. Cập nhật, tường lửa, tự cập nhật, swap

```
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y -o Dpkg::Options::=--force-confold full-upgrade
apt-get -y install ufw unattended-upgrades ca-certificates curl gnupg

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 26266/tcp comment "ssh"
ufw allow 80/tcp comment "http"
ufw allow 443/tcp comment "https"
ufw --force enable

printf '%s\n' 'APT::Periodic::Update-Package-Lists "1";' 'APT::Periodic::Unattended-Upgrade "1";' > /etc/apt/apt.conf.d/20auto-upgrades
systemctl enable --now unattended-upgrades

fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Có `/var/run/reboot-required` thì khởi động lại (`systemctl reboot`), rồi kiểm SSH, `ufw status` và `swapon --show`.

Cổng SSH là cổng BKNS đặt (`26266`). Đổi cổng SSH thì phải mở cổng mới trong `ufw` trước khi đổi.

## 5. Docker và Node.js

Docker Engine và Compose plugin từ kho chính thức của Docker; Node.js 24 từ kho của NodeSource. Kiểm dấu vân tay của key trước khi dùng kho:

- Docker: `9DC858229FC7DD38854AE2D88D81803C0EBFCD88`
- NodeSource: `6F71F525282841EEDAF851B42F59B5F99B1BE0B4`

```
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
gpg --show-keys /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list

curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
gpg --show-keys /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" > /etc/apt/sources.list.d/nodesource.list

apt-get update
apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin nodejs

cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
systemctl restart docker
```

Đã cài ngày 2026-11-05: Docker 29.9.3, Compose v5.7.0, Node.js v24.22.2.

Docker publish cổng thì đi vòng qua `ufw`. Vì vậy chỉ container Caddy publish cổng 80 và 443, là hai cổng `ufw` đã mở; container của app không publish cổng nào (spec mục 2.3).

## 6. User quản trị `aoadmin`

```
adduser --disabled-password --gecos "" aoadmin
usermod -aG sudo aoadmin
install -d -m 700 -o aoadmin -g aoadmin /home/aoadmin/.ssh
install -m 600 -o aoadmin -g aoadmin /root/.ssh/authorized_keys /home/aoadmin/.ssh/authorized_keys
```

**Bạn đặt mật khẩu của `aoadmin`** cho `sudo`, trong PowerShell của bạn. Lệnh hỏi mật khẩu hai lần mà không hiện chữ:

```
ssh -p 26266 -i "$env:USERPROFILE\.ssh\ao_vps" -t root@42.96.4.120 passwd aoadmin
```

## 7. Tên miền (bạn làm)

Một bản ghi A wildcard `*.ao.t2g.io.vn` trỏ về IP của VPS, nên mọi subdomain của môi trường (`pilot-dev.ao.t2g.io.vn`, `pilot.ao.t2g.io.vn`…) trỏ về VPS mà không phải thêm bản ghi. Trong trang quản lý của BKNS **(đối chiếu giao diện)**:

1. Bấm **Quản lý dịch vụ** → **Quản lý dns**.
2. Bấm vào tên miền `t2g.io.vn`.
3. Bấm **Thêm bản ghi**.
4. Điền **Loại** `A`, **Tên** `*.ao`, **Giá trị** `42.96.4.120`; **TTL** để mặc định.
5. Bấm lưu.

Kiểm từ máy bạn: `nslookup pilot-dev.ao.t2g.io.vn 8.8.8.8` trả `42.96.4.120`.

## 8. Caddy

Caddy 2 chạy trong container, giữ cổng 80 và 443, và tự lấy chứng chỉ HTTPS của Let's Encrypt cho từng subdomain có trong Caddyfile. Image ghim theo phiên bản và digest:

```
install -d -m 755 /etc/ao/caddy
cat > /etc/ao/caddy/Caddyfile <<'EOF'
# ai-orchestrator (docs/vps-setup.md): Caddy in front of every environment. The deployer writes the sites (T9).
:80 {
	respond 404
}
EOF
docker run -d --name caddy -p 80:80 -p 443:443 --restart unless-stopped \
  -v /etc/ao/caddy/Caddyfile:/etc/caddy/Caddyfile:ro -v caddy_data:/data -v caddy_config:/config \
  caddy:2.11.8-alpine@sha256:f6228111e5fafa1a5238258d0858e103f10599b8d1659a146e7726681a002bb9
```

- Caddyfile này chưa có site nào, nên mọi request vào cổng 80 nhận 404. Deployer ghi các site (T9 của plan).
- Chứng chỉ và tài khoản ACME nằm trong volume `caddy_data`. Xóa hay tạo lại container thì không mất chứng chỉ.
- Ngày 2026-11-05 (T2), Caddy lấy được chứng chỉ Let's Encrypt cho `pilot-dev.ao.t2g.io.vn` ngay lần chạy đầu.

## 9. Tắt đăng nhập root khi cài xong

Cuối mỗi đợt cài, Claude đổi `PermitRootLogin prohibit-password` thành `PermitRootLogin no` trong `00-ao-hardening.conf`:

```
sed -i 's/^PermitRootLogin prohibit-password$/PermitRootLogin no/' /etc/ssh/sshd_config.d/00-ao-hardening.conf
sshd -t && systemctl restart ssh
```

Từ đó chỉ `aoadmin` đăng nhập được, và `sudo` cần mật khẩu của bạn. Cài xong mỗi đợt, bạn gỡ key khỏi ssh-agent (mục 1).

Khi cần một đợt cài mới, bạn mở lại cho root đăng nhập bằng key, trong PowerShell của bạn:

```
ssh -p 26266 -i "$env:USERPROFILE\.ssh\ao_vps" -t aoadmin@42.96.4.120 "sudo sed -i 's/^PermitRootLogin no$/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config.d/00-ao-hardening.conf && sudo systemctl restart ssh"
```

## 10. Kiểm lại

Từ máy bạn, sau mục 9:

```
ssh.exe -p 26266 -o IdentitiesOnly=yes -i "C:\Users\Huu Tung\.ssh\ao_vps.pub" root@42.96.4.120
# root@42.96.4.120: Permission denied (publickey).
ssh.exe -p 26266 -o PubkeyAuthentication=no -o PreferredAuthentications=password,keyboard-interactive aoadmin@42.96.4.120
# aoadmin@42.96.4.120: Permission denied (publickey).
```

- `aoadmin` đăng nhập bằng key vẫn được.
- Quét mọi cổng TCP chỉ thấy cổng SSH `26266`, 80 và 443 mở. Khi Caddyfile chưa có site HTTPS nào, như sau T2, cổng 443 cũng đóng.
