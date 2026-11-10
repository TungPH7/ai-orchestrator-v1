# Cài VPS cho ai-orchestrator

Hướng dẫn này thuộc module `release-workflow` ([SPEC-release-workflow.md](../SPEC-release-workflow.md), mục 2.3 và 2.11). Một VPS chạy cả ba môi trường của mọi dự án dùng kit. Các bước dưới đây là đúng các lệnh đã chạy trên VPS của kit, theo thứ tự, để cài lại được từ đầu.

- Chỉ phiên chính của Claude dùng SSH vào VPS, khi bạn yêu cầu. Agent của kit không bao giờ SSH.
- Key, mật khẩu và token không bao giờ đi qua chat, repo hay log. Bạn tự gõ chúng trong terminal của bạn.
- Phần cài deployer nằm ở mục 11.

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
# ai-orchestrator (docs/vps-setup.md): Caddy in front of every environment. The deployer writes the sites (section 11).
:80 {
	respond 404
}
EOF
docker run -d --name caddy -p 80:80 -p 443:443 --restart unless-stopped \
  -v /etc/ao/caddy/Caddyfile:/etc/caddy/Caddyfile:ro -v caddy_data:/data -v caddy_config:/config \
  caddy:2.11.8-alpine@sha256:f6228111e5fafa1a5238258d0858e103f10599b8d1659a146e7726681a002bb9
```

- Caddyfile này chưa có site nào, nên mọi request vào cổng 80 nhận 404. Từ khi cài deployer (mục 11), deployer ghi Caddyfile: một site cho mỗi subdomain của `deployer.yaml`, chuyển tới app `public` của bản đang chạy ở môi trường đó.
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

## 11. Cài deployer

Làm ở T18 của plan, sau khi bạn mở lại cho root đăng nhập bằng key (mục 9). Claude chạy các lệnh dưới đây qua SSH bằng root. Bước 4 do bạn làm. Xong thì Claude tắt lại đăng nhập root (mục 9), và bạn gỡ key khỏi ssh-agent.

**1. User `aodeploy` và thư mục** (spec mục 2.3). `aodeploy` nằm trong nhóm `docker`, nên gần như có quyền root (spec mục 12). Không ai đăng nhập được bằng user này.

```
useradd --system --home-dir /var/lib/ao --shell /usr/sbin/nologin --groups docker aodeploy
install -d -o aodeploy -g aodeploy -m 700 /var/lib/ao
install -d -o root -g aodeploy -m 750 /etc/ao /etc/ao/secrets
install -d -o root -g root -m 755 /opt/ao
chown aodeploy:aodeploy /etc/ao/caddy/Caddyfile
```

Deployer ghi đè Caddyfile tại chỗ, vì container Caddy gắn đúng file đó (mục 8).

**2. Bản kit ghim.** Claude đóng gói một commit của `main` kit trên máy bạn, chép lên VPS, rồi cài dependency. Commit ghim được ghi vào mục 12 của tài liệu này và vào `tasks/archive/release-workflow/verification.md`. Claude chỉ chép bản mới khi bạn yêu cầu (spec mục 8).

```
git -C ai-orchestrator archive --format=tar.gz -o ao-kit.tar.gz <commit>
scp -P 26266 ao-kit.tar.gz root@42.96.4.120:/tmp/ao-kit.tar.gz
```

Trên VPS:

```
rm -rf /opt/ao/kit && install -d -o root -g root -m 755 /opt/ao/kit
tar -xzf /tmp/ao-kit.tar.gz -C /opt/ao/kit && rm /tmp/ao-kit.tar.gz
cd /opt/ao/kit && npm ci --omit=dev --ignore-scripts
```

**3. Key của App `ao-deploy`.** Claude chép file bằng `scp` mà không mở nó (plan, quyết định 7). Sau đó bạn xóa bản ở máy.

```
scp -P 26266 "C:/Users/Huu Tung/ao-keys/tungph7-ao-deploy.pem" root@42.96.4.120:/tmp/ao-deploy.pem
```

```
install -o root -g aodeploy -m 640 /tmp/ao-deploy.pem /etc/ao/ao-deploy.pem && shred -u /tmp/ao-deploy.pem
```

**4. Token Jira chỉ đọc và mật khẩu basic auth (bạn làm).** Bạn chạy hai lệnh này trong PowerShell của bạn. Script `vps/ao-secret.sh` hỏi giá trị mà không hiện chữ, rồi ghi file `root:aodeploy 0640`. Giá trị không nằm trong lịch sử lệnh, tham số của tiến trình hay log.

```
ssh -p 26266 -i "$env:USERPROFILE\.ssh\ao_vps" -t root@42.96.4.120 bash /opt/ao/kit/vps/ao-secret.sh jira
ssh -p 26266 -i "$env:USERPROFILE\.ssh\ao_vps" -t root@42.96.4.120 bash /opt/ao/kit/vps/ao-secret.sh basic-auth
```

- Lệnh thứ nhất hỏi token có scope `read:jira-work` của tài khoản `orchestratorci`. Đó là giá trị của biến `AO_JIRA_READ_TOKEN` trên máy bạn.
- Lệnh thứ hai hỏi mật khẩu của user `ao` cho Development và Staging. Trên VPS chỉ lưu bản băm bcrypt. Trên máy bạn, biến `AO_ENV_AUTH` của user Windows mang giá trị `ao:<mật khẩu đó>`. Mật khẩu không được chứa dấu nháy kép, dấu `\` hay ký tự xuống dòng, vì `qa` đưa nó cho `curl` trong một dòng cấu hình; `ao-step` từ chối chạy `qa` khi mật khẩu có các ký tự đó.
- Biến bí mật của app dùng cùng script: `bash /opt/ao/kit/vps/ao-secret.sh env <dự án> <môi trường> <TÊN>`.

**5. Biến không bí mật của app.** Claude ghi thẳng, ví dụ cho `ao-pilot`:

```
install -d -o root -g aodeploy -m 750 /etc/ao/secrets/pilot
for env in development staging production; do
  install -o root -g aodeploy -m 640 /dev/null /etc/ao/secrets/pilot/$env.env
  printf 'HOST=0.0.0.0\nPORT=3000\n' > /etc/ao/secrets/pilot/$env.env
done
```

**6. `deployer.yaml`.** Claude chép từ `vps/deployer.example.yaml`, và chỉ giữ những dự án đã cài App `ao-deploy`. Lúc đầu chỉ có `pilot`; `sample` vào sau, ở Pilot 2.

```
install -o root -g aodeploy -m 640 /opt/ao/kit/vps/deployer.example.yaml /etc/ao/deployer.yaml
```

**7. Điểm bắt đầu và systemd.** `baseline` in head hiện tại của `develop`, `main` và nhánh release đang mở. Có `--confirm` thì deployer ghi các head đó là đã kiểm, và chỉ deploy từ commit kế tiếp, hoặc từ yêu cầu deploy của bạn.

```
install -m 644 /opt/ao/kit/vps/ao-deploy.service /opt/ao/kit/vps/ao-deploy.timer /etc/systemd/system/
systemctl daemon-reload
cd /var/lib/ao
sudo -u aodeploy -H node /opt/ao/kit/scripts/ao-deploy.mjs baseline pilot
sudo -u aodeploy -H node /opt/ao/kit/scripts/ao-deploy.mjs baseline pilot --confirm
sudo -u aodeploy -H node /opt/ao/kit/scripts/ao-deploy.mjs tick --dry-run
systemctl enable --now ao-deploy.timer
```

**8. Kiểm.**

```
systemctl status ao-deploy.timer
journalctl -u ao-deploy --since "10 min ago"
```

- Timer chạy, và mỗi lượt bắt đầu khoảng một phút sau khi lượt trước xong.
- Log không có token, key hay giá trị biến nào của app.
- Lượt đầu ghi Caddyfile với site của ba môi trường của `pilot`, mỗi site trả 503 tới lần deploy đầu, rồi reload Caddy. Caddy lấy chứng chỉ cho cả ba tên.
- `caddy hash-password` đọc được mật khẩu từ stdin; T18 kiểm bằng một lần đăng nhập basic auth.

## 12. Cập nhật bản kit trên VPS

Bản kit ghim theo một commit của `main`, nên bản sửa của deployer hay `audit` chỉ có hiệu lực khi được chép lên. Commit ghim hiện tại: `521e03179908062080de9fd6b8fd9c77dfece2fc`. Việc này cần đăng nhập root (mục 9), và bạn đồng ý từng lần.

Trên máy bạn, ở repo kit:

```
git archive --format=tar.gz -o ao-kit.tar.gz <commit>
scp -P 26266 ao-kit.tar.gz root@42.96.4.120:/tmp/ao-kit.tar.gz
```

Trên VPS:

```
systemctl stop ao-deploy.timer
until [ "$(systemctl is-active ao-deploy.service)" != "activating" ]; do sleep 5; done
rm -rf /opt/ao/kit && install -d -o root -g root -m 755 /opt/ao/kit
tar -xzf /tmp/ao-kit.tar.gz -C /opt/ao/kit && rm /tmp/ao-kit.tar.gz
cd /opt/ao/kit && npm ci --omit=dev --ignore-scripts
cd /var/lib/ao && sudo -u aodeploy -H node /opt/ao/kit/scripts/ao-deploy.mjs tick --dry-run
systemctl start ao-deploy.timer
```

- Service kiểu `oneshot` báo `activating` suốt lúc chạy, nên vòng `until` chờ đúng trạng thái đó. Dừng timer không dừng lượt đang chạy, và `systemctl is-active --quiet` trả lỗi với `activating`, nên không dùng lệnh đó để chờ.
- `tick --dry-run` không in gì khi không có việc.
- Xong thì tắt đăng nhập root (mục 9), rồi ghi commit ghim mới vào mục này.
