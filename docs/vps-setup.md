# Cài VPS cho ai-orchestrator

Hướng dẫn này thuộc module `release-workflow` ([SPEC-release-workflow.md](../SPEC-release-workflow.md), mục 2.3 và 2.11). Một VPS chạy cả ba môi trường của mọi dự án dùng kit. Các bước dưới đây là đúng các lệnh đã chạy trên VPS của kit, theo thứ tự, để cài lại được từ đầu.

- Chỉ phiên chính của Claude dùng SSH vào VPS, khi bạn yêu cầu. Agent của kit không bao giờ SSH.
- Key, mật khẩu và token không bao giờ đi qua chat, repo hay log. Bạn tự gõ chúng trong terminal của bạn.
- Phần cài deployer nằm ở mục 11. Thêm một dự án vào deployer đang chạy: mục 13. Database của dự án: mục 14. Backup và khôi phục: mục 15.

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

**Dự án có nhiều app công khai** (project-scaffold phần 2, mục 2.4). Một app công khai thì dùng `hosts` một host cho mỗi môi trường, như `pilot` ở trên. Từ hai app công khai trở lên, mỗi app có host riêng cho từng môi trường:

```yaml
  - name: shop
    repo: TungPH7/shop
    space: SHOP
    hosts:
      user:
        development: shop-dev.ao.t2g.io.vn
        staging: shop-staging.ao.t2g.io.vn
        production: shop.ao.t2g.io.vn
      admin:
        development: shop-admin-dev.ao.t2g.io.vn
        staging: shop-admin-staging.ao.t2g.io.vn
        production: shop-admin.ao.t2g.io.vn
```

- Tên app là tên trong `deploy.yaml`; các host phải giống `hosts` của từng app trong `project.yaml`. `ao-kit doctor` in sẵn đoạn này.
- Bản ghi wildcard `*.ao.t2g.io.vn` (mục 7) đã trỏ mọi host này về VPS, nên không phải thêm bản ghi DNS.
- Caddy có một site cho mỗi host; site của app chưa chạy ở môi trường đó trả 503.
- Không host nào được dùng hai lần trên VPS: `npm run validate` của kit và deployer đều kiểm.

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

Bản kit ghim theo một commit của `main`, nên bản sửa của deployer hay `audit` chỉ có hiệu lực khi được chép lên. Commit ghim hiện tại: `97db806c09b7a5922be4ee16f2d1b0ad2f878348` (2026-11-14, project-scaffold phần 3, T23: luật giữ bản backup 48 giờ). Trước đó là `3a1c729` (phần 3, T19), ở `/opt/ao/kit.prev`. Bản trước nằm ở `/opt/ao/kit.prev`. Việc này cần đăng nhập root (mục 9), và bạn đồng ý từng lần.

Trên máy bạn, ở repo kit:

```
git archive --format=tar.gz -o ao-kit.tar.gz <commit>
scp -P 26266 ao-kit.tar.gz root@42.96.4.120:/tmp/ao-kit.tar.gz
```

Trên VPS:

```
systemctl stop ao-deploy.timer
until [ "$(systemctl is-active ao-deploy.service)" != "activating" ]; do sleep 5; done
rm -rf /opt/ao/kit.prev && mv /opt/ao/kit /opt/ao/kit.prev && install -d -o root -g root -m 755 /opt/ao/kit
tar -xzf /tmp/ao-kit.tar.gz -C /opt/ao/kit && rm /tmp/ao-kit.tar.gz
cd /opt/ao/kit && npm ci --omit=dev --ignore-scripts
cd /var/lib/ao && sudo -u aodeploy -H node /opt/ao/kit/scripts/ao-deploy.mjs tick --dry-run
systemctl start ao-deploy.timer
```

- Service kiểu `oneshot` báo `activating` suốt lúc chạy, nên vòng `until` chờ đúng trạng thái đó. Dừng timer không dừng lượt đang chạy, và `systemctl is-active --quiet` trả lỗi với `activating`, nên không dùng lệnh đó để chờ.
- `tick --dry-run` không in gì khi không có việc.
- Xong thì tắt đăng nhập root (mục 9), rồi ghi commit ghim mới vào mục này.

## 13. Thêm một dự án vào deployer

Làm khi một dự án lên VPS lần đầu. Các lệnh dưới đây là của `shop` (project-scaffold phần 2, T24, 2026-11-13). Việc này cần đăng nhập root (mục 9), và bạn đồng ý từng lần.

**1. App `ao-deploy` (bạn làm).** Cài App vào repo của dự án, như [docs/getting-started.md](getting-started.md) phần 5, bước 8. Thiếu App thì `baseline` dừng với `App 5624698 is not installed on TungPH7/shop`.

**2. Dừng deployer, sao lưu `deployer.yaml`.**

```
systemctl stop ao-deploy.timer
until [ "$(systemctl is-active ao-deploy.service)" != "activating" ]; do sleep 5; done
cp -p /etc/ao/deployer.yaml /root/deployer.yaml.$(date +%F).bak
cp -p /etc/ao/caddy/Caddyfile /root/Caddyfile.$(date +%F).before
```

Bản sao Caddyfile chỉ để so ở bước 5. Nó có bản băm của basic auth, nên bị xóa ở bước 7.

**3. Biến của app.** Một file cho mỗi môi trường, chỉ cho môi trường mà dự án sắp chạy. Ở `shop` chỉ có Development; Staging và Production có file khi tới bản release đầu.

```
install -d -o root -g aodeploy -m 750 /etc/ao/secrets/shop
install -o root -g aodeploy -m 640 /dev/null /etc/ao/secrets/shop/development.env
printf 'API_URL=http://api:3001\nAUTH_SECRET=%s\n' "$(openssl rand -base64 48)" > /etc/ao/secrets/shop/development.env
```

- `printf` là lệnh có sẵn trong shell, nên giá trị sinh ra không nằm trong tham số của tiến trình nào và không bị in ra. `AUTH_SECRET` dài 64 ký tự.
- Giá trị do bạn đặt thì bạn gõ bằng `ao-secret.sh` (mục 11, bước 4): `bash /opt/ao/kit/vps/ao-secret.sh env shop development <TÊN>`.
- Kiểm bằng tên biến và độ dài giá trị, không in giá trị.
- Dự án có khóa `database` trong `deploy.yaml` cần thêm file `<môi trường>.db.env`, và các biến database trong `<môi trường>.env`. Cách ghi ở mục 14, bước 2. Thiếu file `.db.env` thì deployer không deploy, và status `error` nói đúng file thiếu.

**4. Thêm dự án vào `deployer.yaml`.** Claude nối đoạn mà `ao-kit doctor` in ra vào cuối `projects:`, qua stdin. Quyền file giữ nguyên `root:aodeploy 640`. Dự án có từ hai app công khai thì `hosts` theo từng app, như ví dụ `shop` ở mục 11, bước 6.

Dự án chưa mở cho mọi người thêm dòng `production_auth: true` dưới `space:` (Pilot 3, spec 2.2). Khi đó Production hỏi cùng basic auth với Development và Staging. Smoke test của deployer gọi thẳng container, nên không bị ảnh hưởng. Khóa chỉ nằm ở đây, trên VPS, nên không PR nào mở được Production. Khi bạn quyết mở cho mọi người, xóa dòng này; lượt kế của deployer viết lại Caddyfile.

**5. Điểm bắt đầu, rồi bật lại timer.**

```
cd /var/lib/ao
sudo -u aodeploy -H node /opt/ao/kit/scripts/ao-deploy.mjs baseline shop
sudo -u aodeploy -H node /opt/ao/kit/scripts/ao-deploy.mjs baseline shop --confirm
sudo -u aodeploy -H node /opt/ao/kit/scripts/ao-deploy.mjs tick --dry-run
systemctl start ao-deploy.timer
```

- `baseline` không có `--confirm` in head của `develop` và `main`. Ở `shop` là `91b699c` và `e4a708a`, khớp với GitHub.
- `tick --dry-run` chỉ in `caddy: would write … and reload Caddy`. Không gì được deploy.
- Lượt đầu sau khi bật timer ghi Caddyfile: ở `shop`, thêm 36 dòng cho sáu site, mỗi site trả 503 tới lần deploy đầu. Không dòng nào của dự án khác bị xóa hay sửa. Kiểm bằng cách đếm dòng thêm và xóa so với bản trước, không in Caddyfile, vì file có bản băm của basic auth.
- Nếu `baseline` dừng, chép bản sao lưu về `/etc/ao/deployer.yaml` rồi bật lại timer, để các dự án khác vẫn được deploy trong lúc bạn sửa.

**6. Deploy lần đầu (bạn gõ).** Sau `baseline`, deployer coi head hiện tại của `develop` là đã kiểm, nên không tự deploy nó. Trong Claude Code ở thư mục dự án, gõ `/ao-rollback development <sha của develop>`. Ở `shop`, deployer nhận yêu cầu sau khoảng 15 giây, build hai image trên VPS, rồi deploy xong sau 8 phút 50 giây. Từ lần merge kế tiếp vào `develop`, deployer tự deploy.

**7. Đóng lại.** Đo RAM bằng `free -m` và `docker stats --no-stream`, xóa bản sao Caddyfile bằng `shred -u`, rồi tắt đăng nhập root (mục 9). Bản sao `deployer.yaml` ở `/root` được giữ lại để quay lại khi cần, vì file này không có thông tin đăng nhập.

## 14. Database của dự án

Từ project-scaffold phần 3 (spec mục 2.4), một dự án khai database PostgreSQL trong `.ai-orchestrator/deploy.yaml`:

```yaml
database:
  image: postgres:17-alpine@sha256:<64 ký tự hex>   # bắt buộc ghim digest
  init: apps/api/docker/postgres/init                # chạy một lần, khi volume còn trống
  memory: 256m                                       # không bắt buộc; mặc định 256m
```

**1. Deployer làm gì.**
- Mỗi môi trường có một container `ao-<dự án>-<môi trường>-db`. Dữ liệu nằm trong volume cùng tên. Container có alias `db` trên mạng của môi trường, nên app gọi nó ở `db:5432`.
- Container chạy bằng user `postgres`, với `--cap-drop ALL`, `no-new-privileges` và trần RAM, như container app. Nó không mở cổng nào ra ngoài VPS.
- Deployer tạo container ở lần deploy đầu có khóa `database`: sau khi build image của app, trước khi bật container app mới.
  - Container đang chạy thì để yên; đã dừng thì bật lại.
  - Database phải trả lời `pg_isready` trong 60 giây, nếu không thì deploy dừng với status `error`.
- Volume còn trống thì script trong thư mục `init` chạy một lần. Deployer chép các script này từ commit đang deploy sang `/var/lib/ao/<dự án>/db-init/<môi trường>/`, rồi gắn chỉ đọc vào container. Từ đó, schema đổi bằng migration của app (Flyway), không bằng script init.
- Container mang nhãn `ao.role=database` và không có nhãn `ao.app`. Vì vậy deploy, rollback và dọn image không bao giờ đổi, dừng hay xóa nó.

**2. Biến: hai file cho mỗi môi trường.** Hai file tách nhau vì cùng tên `POSTGRES_PASSWORD` mang hai giá trị: mật khẩu superuser cho container database, và mật khẩu của user app cho app.

| File | Ai nhận | Biến |
|---|---|---|
| `<môi trường>.db.env` | Container database, mọi biến trong file | `POSTGRES_DB`; `POSTGRES_USER=postgres`; `POSTGRES_PASSWORD` là mật khẩu superuser; các biến script init đọc, với template Java là `APP_DB_NAME`, `APP_DB_USER`, `APP_DB_PASSWORD` |
| `<môi trường>.env` | App, chỉ biến có tên trong `env` của app ở `deploy.yaml` | `DB_HOST=db`, `DB_PORT=5432`, `POSTGRES_DB`; `POSTGRES_USER` và `POSTGRES_PASSWORD` là user và mật khẩu của app |

- `POSTGRES_USER` của database phải là `postgres`, vì lệnh chờ `pg_isready` và backup chạy bằng user đó.
- `POSTGRES_DB` phải có, vì backup đọc biến này để biết dump database nào.

Ví dụ cho Development của `shop`, Claude chạy bằng root. Hai mật khẩu được sinh ngay trên VPS và không bị in. Mật khẩu của app nằm trong một biến của shell, rồi được ghi vào cả hai file:

```
f=/etc/ao/secrets/shop/development
install -o root -g aodeploy -m 640 /dev/null $f.db.env
app_password="$(openssl rand -hex 32)"
printf 'POSTGRES_DB=shop\nPOSTGRES_USER=postgres\nPOSTGRES_PASSWORD=%s\nAPP_DB_NAME=shop\nAPP_DB_USER=shop_app\nAPP_DB_PASSWORD=%s\n' "$(openssl rand -hex 32)" "$app_password" > $f.db.env
printf 'SPRING_PROFILES_ACTIVE=staging\nDB_HOST=db\nDB_PORT=5432\nPOSTGRES_DB=shop\nPOSTGRES_USER=shop_app\nPOSTGRES_PASSWORD=%s\n' "$app_password" >> $f.env
unset app_password
awk -F= '{print $1, length($2)}' $f.db.env $f.env
```

- Mật khẩu dạng hex, dài 64 ký tự, vì script init của template đặt mật khẩu vào giữa hai dấu `'` của một câu SQL.
- Dòng `>>` chỉ chạy một lần cho mỗi môi trường. Kiểm trước bằng `grep -c '^POSTGRES_' $f.env`.
- Biến của `.db.env` chỉ có tác dụng khi volume còn trống. Muốn đổi mật khẩu sau đó thì phải đổi cả trong database (`ALTER ROLE`) lẫn trong hai file. Kit chưa có lệnh cho việc này.

**3. Xem database,** bằng lệnh chỉ đọc:

```
docker ps --filter label=ao.role=database --format '{{.Names}}\t{{.Status}}'
docker exec ao-shop-development-db sh -c 'psql -U postgres -d "$POSTGRES_DB" -c "\dt app.*"'
docker stats --no-stream ao-shop-development-db
```

Đừng chạy `docker inspect` không có `--format` trên container database hay container app: lệnh đó in giá trị của mọi biến, kể cả mật khẩu.

**4. Đổi bản Postgres** (chưa chạy thật). Container đang chạy thì deployer để yên, nên PR đổi `image` trong `deploy.yaml` chưa đổi gì trên VPS.

Trong cùng bản chính, ví dụ 17.x lên 17.y để lấy bản vá, dữ liệu dùng lại được:
1. Mở PR đổi digest của `database.image`. Chờ CI xanh nhưng chưa merge.
2. Trên VPS, dừng deployer, backup mọi database, rồi xóa container. Volume giữ nguyên:

   ```
   systemctl stop ao-deploy.timer
   until [ "$(systemctl is-active ao-deploy.service)" != "activating" ]; do sleep 5; done
   systemctl start ao-backup.service
   docker rm --force ao-shop-development-db
   ```

3. Merge PR, rồi bật lại deployer: `systemctl start ao-deploy.timer`.
   - Lượt deploy của commit đó tạo lại container bằng image mới, trên volume cũ. Script init không chạy lại.
   - App không có database từ lúc xóa container tới khi container mới trả lời, tức khoảng thời gian build.
   - Build lỗi thì `/ao-rollback development` đưa bản trước lên, và container database được tạo lại bằng image cũ.
4. Với Staging và Production, làm lại bước 2 trên container của môi trường đó, ngay trước khi commit mang digest mới lên đó: trước `/ao-release` với Staging, trước khi bạn approve ở gate ⑤ với Production.

Sang bản chính khác, ví dụ 17 lên 18, thì file dữ liệu không dùng lại được. Khi đó phải dump, rồi khôi phục vào volume mới trước khi app mới chạy migration. Kit chưa có luồng này; khi cần sẽ làm thành một task riêng.

## 15. Backup và khôi phục

Timer `ao-backup` chạy `scripts/ao-backup.mjs run` bằng root, mỗi ngày lúc 02:30 giờ Việt Nam (spec mục 2.4):
- Mỗi container database đang chạy được dump bằng `pg_dump -Fc` vào `/var/backups/ao/<dự án>/<môi trường>/<dự án>-<môi trường>-<giờ UTC>.dump`.
- Thư mục có quyền 0700 và file có quyền 0600, nên chỉ root đọc được, vì bản dump chứa dữ liệu của người dùng.
- Dump được ghi vào `<tên>.part`, và chỉ đổi tên khi `pg_dump` xong. Nhờ vậy bản dump dở dang không bao giờ được tính.
- Mỗi môi trường giữ mọi bản của 48 giờ gần nhất, rồi bản mới nhất của 7 ngày gần nhất và của 4 tuần gần nhất. Các bản khác bị xóa sau mỗi lần chạy. Ở T22, luật cũ chỉ giữ bản mới nhất của mỗi ngày, nên một lượt chạy tay lúc 04:55 đã xóa bản lúc 04:49 cùng ngày. Luật 48 giờ có để một lượt chạy tay không bao giờ xóa bản của đêm hôm đó.
- Lúc 02:30 mà VPS đang tắt thì lượt đó chạy khi VPS khởi động lại (`Persistent=true`).
- Bản sao ra ngoài VPS chưa có. Chỗ để bản sao sẽ được chọn trước bản release đầu của `shop` (spec mục 9, câu 2).

**1. Cài timer.** Làm một lần cho VPS, khi dự án đầu tiên có database:

```
install -m 644 /opt/ao/kit/vps/ao-backup.service /opt/ao/kit/vps/ao-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ao-backup.timer
systemctl list-timers ao-backup.timer
```

**2. Chạy ngay một lần,** không chờ tới 02:30:

```
systemctl start ao-backup.service
journalctl -u ao-backup --since "10 min ago"
ls -l /var/backups/ao/shop/development/
```

Log chỉ in tên file và số byte của mỗi bản dump, không in dữ liệu.

**3. Kiểm bản mới nhất khôi phục được:**

```
node /opt/ao/kit/scripts/ao-backup.mjs restore-check shop development
```

- Lệnh khôi phục bản mới nhất vào container tạm `ao-restore-check-<dự án>-<môi trường>`, cùng image và không có mạng. Sau đó lệnh so số bảng và số dòng với database đang chạy. Container tạm luôn bị xóa.
- Khớp thì lệnh thoát mã 0.
- Lệch thì lệnh thoát mã 1. Nghĩa là có dòng được ghi sau lúc dump, hoặc bản dump không khôi phục được. Chạy ngay sau bước 2 để hai bên cùng thời điểm.
- Ở T15, lệnh chạy thật trên Docker của máy: 2 bảng, 32 dòng, khớp. Ở T22, trên Development của `shop`: 17 giây, `restored: 3 tables, 6 rows; shop now: 3 tables, 6 rows`.

**4. Khôi phục vào database đang chạy.** Làm khi dữ liệu của một môi trường bị hỏng, ví dụ sau một migration sai. Trước hết, chép bản dump muốn khôi phục ra `/root`, để không lượt backup nào xóa nó trong lúc bạn làm:

```
systemctl stop ao-deploy.timer
until [ "$(systemctl is-active ao-deploy.service)" != "activating" ]; do sleep 5; done
ls -l /var/backups/ao/shop/development/
cp -p /var/backups/ao/shop/development/<file>.dump /root/
docker exec -i ao-shop-development-db sh -c 'exec pg_restore -U postgres --clean --if-exists --single-transaction -d "$POSTGRES_DB"' < /root/<file>.dump
systemctl start ao-deploy.timer
```

- `--clean --if-exists` xóa rồi tạo lại từng đối tượng có trong bản dump, trong một transaction. Lỗi giữa chừng thì database giữ nguyên như trước.
- Dữ liệu ghi sau lúc dump bị mất. Với Production, chạy `systemctl start ao-backup.service` trước, để còn một bản của trạng thái hiện tại; luật 48 giờ giữ cả bản đó lẫn bản của đêm trước.
- Xong thì xóa bản sao ở `/root` bằng `shred -u`, vì nó chứa dữ liệu của người dùng.
- Ở T22, trên Development của `shop`: `pg_restore` xong trong 1 giây, thoát mã 0. Số bảng, số dòng lịch sử Flyway và extension trước và sau như nhau. `api` vẫn trả lời trong lúc khôi phục, và `restore-check` sau đó khớp.
- Bản dump đi qua stdin của `docker exec`, không bị chép vào container.
- Bản dump có cả bảng lịch sử của Flyway, nên schema quay về đúng lúc dump. Nếu app đang chạy có migration mới hơn bản dump, Flyway chỉ chạy lại các migration đó khi app khởi động lại.

## 16. Bản sao backup về máy bạn

Mỗi bản dump mà mục 15 giữ lại có một bản sao mã hóa, và máy bạn tự kéo bản sao về (Pilot 3, spec mục 2.4). Bản sao giúp dữ liệu còn lại khi VPS hỏng hay bị chiếm:
- **Mã hóa bằng `age`.** Khóa công khai (`age1…`) nằm trong `/etc/ao/deployer.yaml`. Khóa bí mật chỉ nằm trên máy bạn, và bạn cất thêm một bản ở chỗ khác. Người đọc được VPS không đọc được bản sao.
- **Tài khoản `aobackup` chỉ đọc.** Nó dùng SFTP với key riêng, bị nhốt trong `/var/backups/ao-offsite` (`vps/sshd-aobackup.conf`): không shell, không chuyển cổng. VPS không giữ quyền gì vào máy bạn, nên kẻ chiếm VPS không xóa được bản trên máy bạn.
- **Máy bạn kéo về** bằng `scripts/ao-backup-pull.mjs`, chạy theo task của Windows mỗi ngày lúc 09:00 và mỗi lần bạn đăng nhập. Máy tắt thì lần sau kéo bù, vì VPS giữ bản của 7 ngày và 4 tuần. Script không xóa gì trên máy bạn.
- `ao-kit doctor` báo khi bản sao mới nhất của dự án trên máy bạn cũ hơn 36 giờ.

**1. Khóa `age` (trên máy bạn).**

```
node scripts/ao-backup-pull.mjs keygen --identity %USERPROFILE%\.ao\ao-backup.agekey
```

Lệnh ghi khóa bí mật vào file đó và in khóa công khai `age1…`. Cất một bản của file khóa ở chỗ khác ngoài máy, như trình quản lý mật khẩu: mất khóa là mất mọi bản sao. Lệnh không ghi đè một khóa đã có.

**2. Key SSH để kéo về (trên máy bạn).** Key không có passphrase, vì task của Windows không gõ được. Key này chỉ đọc được bản sao đã mã hóa.

```
ssh-keygen -t ed25519 -N "" -C ao-backup-pull -f %USERPROFILE%\.ssh\ao_backup_pull
```

Thêm vào `%USERPROFILE%\.ssh\config`:

```
Host ao-backup
    HostName 42.96.4.120
    Port 26266
    User aobackup
    IdentityFile ~/.ssh/ao_backup_pull
    IdentitiesOnly yes
```

**3. Tài khoản `aobackup` (trên VPS, bằng root).**

```
groupadd --system aobackup
useradd --system --gid aobackup --create-home --shell /usr/sbin/nologin aobackup
install -d -o aobackup -g aobackup -m 700 /home/aobackup/.ssh
printf 'restrict %s\n' "<dòng .pub của key ở bước 2>" > /home/aobackup/.ssh/authorized_keys
chown aobackup:aobackup /home/aobackup/.ssh/authorized_keys && chmod 600 /home/aobackup/.ssh/authorized_keys
install -d -o root -g root -m 755 /var/backups/ao-offsite
install -o root -g root -m 644 /opt/ao/kit/vps/sshd-aobackup.conf /etc/ssh/sshd_config.d/60-aobackup.conf
sshd -t && systemctl reload ssh
```

Nếu `sshd_config` có dòng `AllowUsers`, thêm `aobackup` vào dòng đó.

**4. Bật bản sao.** Thêm vào `/etc/ao/deployer.yaml` khóa công khai ở bước 1:

```
backup:
  age_recipient: age1…
```

Rồi chạy `systemctl start ao-backup.service` một lần. Log in thêm một dòng `copy <tên>.dump.age` cho mỗi bản dump.

**5. Kéo về và đặt task (trên máy bạn).**

```
node scripts/ao-backup-pull.mjs pull --host ao-backup --dest D:\ao-backups
node scripts/ao-backup-pull.mjs install --host ao-backup --dest D:\ao-backups
node scripts/ao-backup-pull.mjs status
```

**6. Khôi phục từ bản sao.** Giải mã trên máy bạn:

```
node scripts/ao-backup-pull.mjs decrypt D:\ao-backups\shop\production\<tên>.dump.age --identity %USERPROFILE%\.ao\ao-backup.agekey --out D:\ao-restore\<tên>.dump
```

Bản giải mã là đúng bản dump của mục 15: khôi phục như bước 4 của mục 15, hoặc vào một Postgres chạy trên Docker ở máy bạn để kiểm. Xong thì xóa bản giải mã, vì nó chứa dữ liệu người dùng.

**7. Chuyển sang B2 sau này.** Thư mục bản sao và khóa giữ nguyên. Kit sẽ thêm bước đẩy thư mục đó lên B2 bằng `rclone`; cách khôi phục không đổi.
