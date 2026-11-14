# Tạo GitHub App cho agent

Hướng dẫn này thuộc module `quality-gates` ([SPEC-quality-gates.md](../SPEC-quality-gates.md), mục 2.2); `dev-workflow` thêm ba quyền ([SPEC-dev-workflow.md](../SPEC-dev-workflow.md), mục 2.3). Agent mở PR và đăng báo cáo review bằng hai GitHub App, không bằng tài khoản của bạn, vì GitHub không cho tác giả PR approve PR của chính mình. Có hai App vì tác giả PR cũng không được request changes trên PR của mình, kể cả khi tác giả là bot.

| App | Tên | Repository permissions | Dùng cho |
|---|---|---|---|
| `ao-dev` | `tungph7-ao-dev` | Contents: Read and write; Pull requests: Read and write; Workflows: Read and write; Actions: Read-only; Checks: Read-only | `ba`, `sa`, `fe-dev`, `be-dev`, `devops` mở và sửa PR; agent push commit; `merge-gate` merge |
| `ao-review` | `tungph7-ao-review` | Contents: Read-only; Pull requests: Read and write; Actions: Read-only; Checks: Read-only | `reviewer`, `security` đăng báo cáo review; mọi agent đọc PR và CI bằng token chỉ đọc |
| `ao-deploy` | `tungph7-ao-deploy` | Contents: Read-only; Pull requests: Read-only; Checks: Read-only; Commit statuses: Read-only; Actions: Read-only; Deployments: Read and write | deployer trên VPS đọc code và cổng, rồi báo deployment (mục 7) |

Bạn tạo hai App một lần cho tài khoản. Mỗi dự án mới chỉ cần cài thêm hai App vào repo của dự án (mục 3). App tạo trước `dev-workflow` thiếu ba quyền mới: thêm theo mục 6.

Mỗi token mà kit tạo chỉ xin phần quyền nó cần. Ví dụ, token để `git push` chỉ xin Workflows cho vai trò `devops`, và token đọc PR của agent chỉ có quyền đọc.

Nhãn nút lấy từ tài liệu GitHub. Chỗ ghi **(đối chiếu giao diện)** là nhãn chưa đối chiếu được với màn hình thật: nếu màn hình của bạn khác, chụp màn hình gửi Claude.

## Cách nhanh: script tạo App

Script `scripts/github-app-create.mjs` dùng manifest flow của GitHub: nó điền sẵn tên, mô tả, quyền, tắt webhook, chọn "Only on this account", rồi nhận private key thẳng từ GitHub và ghi vào `C:\Users\Huu Tung\ao-keys\<slug>.pem`. Key không đi qua thư mục Downloads, chat hay log.

1. Claude chạy, hoặc bạn chạy trong thư mục `ai-orchestrator`:

   ```
   node scripts/github-app-create.mjs --owner TungPH7 --repo ao-pilot
   ```

2. Mở `http://127.0.0.1:47100/` trên trình duyệt đang đăng nhập GitHub. Trang liệt kê hai App.
3. Với App đầu tiên, bấm **Tạo App trên GitHub**. GitHub mở trang tạo App đã điền sẵn; bấm nút **Create GitHub App for TungPH7** ở cuối trang **(đối chiếu giao diện)**. GitHub có thể hỏi lại mật khẩu hoặc mã xác thực hai bước.
4. GitHub chuyển sang trang cài App. Chọn **Only select repositories**, chọn `ao-pilot` (nếu chưa được chọn sẵn), bấm **Install**.
5. GitHub quay về trang `127.0.0.1`. Làm lại bước 3 và 4 cho App thứ hai. Khi trang ghi "Xong mọi App", script tự dừng và in slug, App ID, đường dẫn file key của từng App.
6. Đặt hai biến môi trường ở mục 4 (Claude làm được, vì giá trị chỉ là đường dẫn). Slug và App ID đã có trong output của script, không cần gửi lại.

Script dừng sau 30 phút nếu chưa xong. File key đã có thì script không ghi đè; muốn tạo lại App thì đổi tên hoặc xóa file cũ trước.

Các mục 1 đến 5 dưới đây là cách làm tay, dùng khi script không chạy được.

## 1. Tạo App

Làm hai lần: lần đầu cho `ao-dev`, lần hai cho `ao-review`.

1. Trên GitHub, bấm ảnh đại diện ở góc trên bên phải, chọn **Settings**.
2. Ở thanh bên trái, kéo xuống cuối, bấm **Developer settings**.
3. Ở thanh bên trái, bấm **GitHub Apps**, rồi bấm nút **New GitHub App**. GitHub có thể hỏi lại mật khẩu hoặc mã xác thực hai bước.
4. Điền form từ trên xuống:
   - **GitHub App name**: `tungph7-ao-dev` (lần hai: `tungph7-ao-review`). Tên phải là duy nhất trên toàn GitHub, tối đa 34 ký tự. Nếu GitHub báo tên đã có người dùng, chọn tên khác và ghi lại.
   - **Description**: `Opens and merges pull requests for the ai-orchestrator agents.` (lần hai: `Posts review reports for the ai-orchestrator agents.`)
   - **Homepage URL**: `https://github.com/TungPH7/ai-orchestrator-v1`
   - **Callback URL**: để trống.
   - **Expire user authorization tokens**, **Request user authorization (OAuth) during installation**, **Enable Device Flow**, **Setup URL**, **Redirect on update**: giữ nguyên mặc định. App không dùng đăng nhập của người dùng.
   - Mục **Webhook**: bỏ chọn ô **Active**. Không cần điền **Webhook URL** và **Webhook secret**.
   - Mục **Permissions**: mở **Repository permissions**. Ở dòng **Contents**, bấm ô chọn quyền bên phải (đang ghi `No access`) và chọn **Read and write**; với `ao-review` chọn **Read-only** **(đối chiếu giao diện)**. Ở dòng **Pull requests**, chọn **Read and write** cho cả hai App. Ở dòng **Actions** và dòng **Checks**, chọn **Read-only** cho cả hai App. Ở dòng **Workflows**, chọn **Read and write**, chỉ cho `ao-dev`. Dòng **Metadata** tự chuyển sang **Read-only**; giữ nguyên. Không đổi quyền nào khác, không mở **Organization permissions** hay **Account permissions**.
   - **Subscribe to events**: không chọn gì. Mục này có thể ẩn khi đã tắt webhook.
   - **Where can this GitHub App be installed?**: chọn **Only on this account**.
5. Bấm **Create GitHub App**. GitHub mở trang cài đặt của App mới, ở mục **General**.
6. Ghi lại hai giá trị ở đầu trang **General**, mục **About** **(đối chiếu giao diện)**:
   - **App ID**: một dãy số.
   - **Public link**: dạng `https://github.com/apps/<slug>`. Phần cuối là slug của App, thường trùng tên App.

   Hai giá trị này không bí mật; bạn gửi cho Claude ở mục 5.

## 2. Tạo private key

Làm cho từng App, ngay sau khi tạo App.

1. Vẫn ở trang cài đặt của App. Nếu đã rời trang: **Settings** → **Developer settings** → **GitHub Apps** → bấm **Edit** cạnh App.
2. Ở thanh bên trái, bấm **Credentials**, rồi **Key pairs**, rồi bấm **New key**. Nếu không thấy mục **Credentials**, kéo xuống cuối trang **General**, tới mục **Private keys**, bấm **Generate a private key** **(đối chiếu giao diện)**.
3. Trình duyệt tải về một file `.pem`, thường vào thư mục Downloads, tên dạng `tungph7-ao-dev.2026-10-29.private-key.pem`.
4. Tạo thư mục `C:\Users\Huu Tung\ao-keys`, rồi chuyển (cắt và dán, không sao chép) file `.pem` vào đó. Thư mục này nằm ngoài mọi repo và ngoài các thư mục OneDrive có thể đồng bộ, như Desktop và Documents.
5. Không mở file để sao chép nội dung, và không dán nội dung file vào chat, issue, commit hay bất cứ đâu.

Workflow `merge-gate` trên GitHub Actions sẽ dùng một key thứ hai của `ao-dev`. Key đó tạo ở bước sau, khi cài `merge-gate`; bây giờ chưa cần.

## 3. Cài App vào repo của dự án

Làm cho cả hai App.

1. Ở trang cài đặt của App, thanh bên trái, bấm **Install App**.
2. Bấm **Install** cạnh tài khoản `TungPH7`.
3. Chọn **Only select repositories**. Mở danh sách **Select repositories** và chọn `TungPH7/ao-pilot`.
4. Bấm **Install**.

Dự án sau: App đã cài trên tài khoản rồi, nên chỉ cần thêm repo. Vào **Settings** → **Applications** → thẻ **Installed GitHub Apps**, bấm **Configure** cạnh App, ở mục **Repository access** chọn thêm repo, rồi bấm **Save** **(đối chiếu giao diện)**.

## 4. Đặt biến môi trường

Biến môi trường chỉ chứa đường dẫn tới file key, không chứa nội dung key.

1. Mở File Explorer, vào `C:\Users\Huu Tung\ao-keys`. Giữ phím Shift, bấm chuột phải vào file key của `ao-dev`, chọn **Sao chép dưới dạng đường dẫn** (bản tiếng Anh: **Copy as path**). Đường dẫn được chép kèm dấu ngoặc kép ở hai đầu.
2. Bấm Start, gõ `biến môi trường`, chọn **Chỉnh sửa biến môi trường cho tài khoản của bạn** (bản tiếng Anh: **Edit environment variables for your account**).
3. Ở khung trên, **Biến người dùng cho Huu Tung**, bấm **Mới...**.
4. **Tên biến**: `AO_DEV_APP_KEY_FILE`. **Giá trị biến**: dán đường dẫn vừa chép, rồi xóa hai dấu ngoặc kép ở đầu và cuối. Bấm **OK**.
5. Lặp lại bước 1, 3, 4 cho file key của `ao-review`, với **Tên biến** `AO_REVIEW_APP_KEY_FILE`.
6. Bấm **OK** để đóng hộp thoại.

Claude đọc biến từ registry ngay trong lệnh, nên không cần khởi động lại Claude Code. Các chương trình khác thấy biến mới sau khi được mở lại.

## 5. Báo cho Claude

Gửi Claude slug và App ID của hai App, ví dụ:

```
ao-dev: tungph7-ao-dev, 1234567
ao-review: tungph7-ao-review, 1234568
```

Claude ghi bốn giá trị này vào mục `env` của `.claude/settings.json` của dự án (`AO_DEV_APP`, `AO_DEV_APP_ID`, `AO_REVIEW_APP`, `AO_REVIEW_APP_ID`), rồi kiểm từng App lấy được token cho repo của dự án.

## 6. Thêm quyền cho dev-workflow

Làm mục này một lần nếu hai App được tạo trước module `dev-workflow`. App tạo bằng script hay theo mục 1 từ nay đã có đủ quyền.

| App | Thêm quyền |
|---|---|
| `ao-dev` | Workflows: Read and write; Actions: Read-only; Checks: Read-only |
| `ao-review` | Actions: Read-only; Checks: Read-only |

**Sửa quyền của App**, làm cho từng App, bắt đầu với `tungph7-ao-dev`:

1. Trên GitHub, bấm ảnh đại diện ở góc trên bên phải, chọn **Settings**.
2. Ở thanh bên trái, kéo xuống cuối, bấm **Developer settings**.
3. Ở thanh bên trái, bấm **GitHub Apps**. Bấm **Edit** bên phải tên App.
4. Ở thanh bên trái của trang App, bấm **Permissions & events**.
5. Mở **Repository permissions**. Với mỗi dòng trong bảng trên, bấm ô chọn quyền bên phải (đang ghi `No access`) và chọn mức ghi trong bảng. Không đổi dòng nào khác.
6. Ô **Add a note to users** có thể để trống.
7. Kéo xuống cuối, bấm **Save changes**. GitHub có thể hỏi lại mật khẩu hoặc mã xác thực hai bước.
8. Làm lại bước 3–7 cho `tungph7-ao-review`.

**Chấp nhận quyền mới trên tài khoản của bạn.** Quyền mới chỉ có hiệu lực sau khi được chấp nhận ở nơi cài App:

1. Bấm ảnh đại diện, chọn **Settings**.
2. Ở thanh bên trái, mục **Integrations**, bấm **Applications**.
3. Bấm tab **Installed GitHub Apps**. Bấm **Configure** bên phải `tungph7-ao-dev`.
4. Đầu trang có thông báo App xin thêm quyền. Bấm **Review request**, xem danh sách quyền, rồi bấm **Accept new permissions** **(đối chiếu giao diện)**. GitHub cũng gửi email về yêu cầu này, và link trong email dẫn tới cùng trang.
5. Quay lại tab **Installed GitHub Apps**, làm lại bước 3–4 cho `tungph7-ao-review`.

Xong thì nhắn Claude. Claude kiểm mỗi App lấy được token có đúng các quyền mới cho repo của dự án.

## 7. App `ao-deploy` cho release-workflow

Module `release-workflow` ([SPEC-release-workflow.md](../SPEC-release-workflow.md), mục 2.3) thêm App thứ ba. Deployer trên VPS dùng App này để đọc code, PR và CI của repo dự án, kiểm cổng, rồi báo deployment. App không ghi được code hay PR. Agent không dùng App này.

**Tạo App bằng script:**

1. Claude chạy trong thư mục `ai-orchestrator`:

   ```
   node scripts/github-app-create.mjs --owner TungPH7 --repo ao-pilot --apps deploy --timeout-minutes 120
   ```

2. Mở `http://127.0.0.1:47100/` trên trình duyệt đang đăng nhập GitHub. Trang chỉ có một App: `tungph7-ao-deploy`.
3. Bấm **Tạo App trên GitHub**. Trên trang của GitHub, mục quyền phải có đúng sáu dòng như bảng ở đầu tài liệu, cộng dòng Metadata: Read-only mà GitHub luôn tự thêm. Bấm **Create GitHub App for TungPH7** ở cuối trang **(đối chiếu giao diện)**. GitHub có thể hỏi lại mật khẩu hoặc mã xác thực hai bước.
4. GitHub chuyển sang trang cài App. Chọn **Only select repositories**, chọn repo dự án (ở đây là `ao-pilot`) nếu chưa được chọn sẵn, rồi bấm **Install**. Không cài App lên repo kit.
5. GitHub quay về trang `127.0.0.1`, ghi "Xong mọi App". Script tự dừng, rồi in slug, App ID và đường dẫn file key `C:\Users\Huu Tung\ao-keys\tungph7-ao-deploy.pem`.
6. Claude đặt biến môi trường `AO_DEPLOY_APP_KEY_FILE` là đường dẫn đó, rồi kiểm App lấy được token cho repo dự án.

Mỗi dự án mới cài thêm `ao-deploy` vào repo của dự án, như mục 3.

App `tungph7-ao-deploy` tạo bằng bản script trước bản sửa ngày 2026-11-05 thiếu quyền **Commit statuses: Read-only**, mà `audit` cần để đọc kết quả CI của commit. Thêm quyền này theo cách ở mục 6, rồi chấp nhận nó trên tài khoản của bạn.

**Key của `ao-deploy` cuối cùng chỉ nằm trên VPS.** Lúc kiểm tiền đề, key nằm ở `ao-keys` trên máy bạn, như hai App kia. Khi cài deployer, Claude chép file lên VPS bằng `scp` mà không mở file (`docs/vps-setup.md`). Sau đó bạn xóa file ở máy và biến `AO_DEPLOY_APP_KEY_FILE`.

## 8. App `ao-merge` cho merge-gate

Từ Pilot 3 (spec 2.9), `merge-gate` merge bằng App thứ tư `<owner>-ao-merge`. Ruleset chỉ cho App này merge khi chưa có approve của bạn ([quality-gates.md](quality-gates.md#ruleset)). App có ba quyền ghi: **Contents**, **Pull requests** (merge, gắn tag, mở PR merge ngược) và **Workflows** (merge PR có đổi file workflow). Nó không đọc gì thêm, vì `merge-gate` đọc bằng token của workflow. Key của nó chỉ nằm trong secret `AO_MERGE_APP_KEY` của environment `merge-gate`. Lý do: mọi agent có quyền ghi git đều cầm token của `ao-dev`, nên App được đi tắt không được là `ao-dev` (review của `shop` PR #13).

1. Chạy, từ thư mục kit, với một thư mục tạm cho key:

   ```
   node scripts/github-app-create.mjs --owner TungPH7 --repo <repo của dự án> --apps merge --keys-dir <thư mục tạm>
   ```

2. Mở `http://127.0.0.1:47100/`, bấm **Tạo App trên GitHub**, rồi **Create GitHub App for TungPH7**. GitHub có thể hỏi lại mật khẩu hoặc mã xác thực hai bước.
3. GitHub chuyển sang trang cài App, đã chọn sẵn repo của dự án: bấm **Install**. Script in slug và App ID.
4. Ghi slug và App ID vào `project.yaml`, ở `github.apps.merge` và `github.apps.merge_id`, rồi `ao-kit render`.
5. `ao-kit setup github <thư mục dự án> --merge-app-key-file <thư mục tạm>/<slug>.pem` đưa key vào secret `AO_MERGE_APP_KEY` của environment `merge-gate`, và áp ruleset với id của App.
6. **Xóa file key** trong thư mục tạm. `doctor` báo đỏ khi thấy file `*-ao-merge.pem` trong `ao-keys`.

Dự án khác dùng lại App này: chỉ cài App vào repo (mục 3), ghi slug và id vào `project.yaml`, rồi đặt secret. Key thì tạo mới cho mỗi repo trên trang của App (mục 2), để thu hồi riêng được.

## Giữ an toàn private key

- Private key là bí mật quan trọng nhất của App: ai có file này đều làm được mọi việc App được phép, trên mọi repo App được cài.
- Key của `ao-dev` và `ao-review` nằm trong thư mục `ao-keys` trên máy bạn. Key của `ao-merge` chỉ nằm trong secret của environment `merge-gate` (mục 8). Key của `ao-deploy` chỉ nằm trên VPS (mục 7). Mỗi nơi một key riêng, để thu hồi riêng được. Một App có tối đa 25 key.
- Key thứ hai của `ao-dev` mà `merge-gate` dùng trước Pilot 3 (secret `AO_DEV_APP_KEY` của environment `merge-gate`) không còn cần cho dự án đã có `ao-merge`. Bạn xóa secret đó và key đó trên trang của App khi muốn.
- Nghi key bị lộ: vào trang cài đặt của App, **Credentials** → **Key pairs** (hoặc mục **Private keys**), xóa key đó, tạo key mới, rồi cập nhật file và biến môi trường.
