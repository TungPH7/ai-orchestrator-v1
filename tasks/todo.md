# Task: project-scaffold, phần 1 (B1)

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-project-scaffold.md](../SPEC-project-scaffold.md). Làm theo thứ tự. Mỗi task viết test đỏ trước.

**Quy ước:**
- Xong mỗi task thì năm lệnh kiểm phải xanh: `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check`, `npm run agents:check`. Từ T8 thêm `npm run profiles:check` khi task đụng `profiles/` hay `lib/scaffold/`.
- Mỗi chặng code một nhánh `task/project-scaffold-<N>` tách từ `main`, mỗi task một commit. Merge qua PR khi CI xanh.
- Commit theo `CLAUDE.md`.
- Task có nhãn **[bạn]** cần bạn bấm trên Jira hay GitHub.

## Chuẩn bị

- [ ] **T1: tài liệu.** Spec ghi đã duyệt, plan, todo, nhật ký Lượt 151–154. PR tài liệu từ nhánh `task/project-scaffold`, tự merge khi CI xanh.
- [ ] **T2 [bạn]: tiền đề Jira.**
  - **Bạn:** tạo một API token thường (không scope) ở trang Atlassian account, rồi đặt làm biến môi trường user `JIRA_ADMIN_CLASSIC_TOKEN` trên Windows. Token không đi qua chat.
  - **Mình:** bằng một script tạm, thử lần lượt:
    1. tạo space `AOG`, loại company-managed;
    2. gán các scheme của `DEMO`: workflow, issue type, screen, permission;
    3. tạo board.

    Mỗi bước ghi API làm được hay không, và mã lỗi nếu không. Space `AOG` dùng tiếp cho T16.
  - **Kiểm:** kết quả ghi vào `tasks/verification.md`.

### Checkpoint 1: sau T2
- [ ] Biết bước Jira nào làm được bằng API. Mục 2.4 của spec đã sửa nếu cần, và bạn duyệt bản sửa trước T12.

## Chặng 1: cấu hình, nhánh `task/project-scaffold-1`

- [ ] **T3: `project.yaml`** (spec 2.1).
  - **Đạt khi:**
    - JSON Schema `lib/scaffold/project.schema.json` và `readProjectConfig` kiểm các khóa của spec 2.1: `name`, `jira.space`, `github` (`repo`, `approvers`, `apps`, `kit_peers`), `repos` (đúng một), `apps` (`repo`, `path`, `profile`, `dev`, `port.env`, `port.default`, `health`, `public`, `env`), `roles.optional`, `claude.allow`;
    - lỗi nêu khóa và lý do;
    - `checkProject` đối chiếu `deploy.yaml` (tên app, cổng, `health`, app công khai) và `package.json` (workspace, bốn script);
    - `ao-kit check <dir>` in kết quả.
  - **Kiểm:** `tests/scaffold/project-config.test.mjs`, với `project.yaml` của `ao-sample` viết theo spec làm mẫu đúng.
  - **File:** `lib/scaffold/project-config.mjs`, `lib/scaffold/project.schema.json`, `scripts/ao-kit.mjs` (lệnh `check`), test.
- [ ] **T4: `settings.json` sinh từ `project.yaml`** (spec 2.1; plan, quyết định 3).
  - **Đạt khi:**
    - `render-agents.mjs --project` ghi `.claude/settings.json` từ bản của kit, cộng `env` và `claude.allow`; `--check` và `--list` có file này;
    - không có `project.yaml` thì giữ cách cũ;
    - `.claude/settings.json` vào `kit_copy.rendered`.
  - **Kiểm:**
    - test đỏ trước: bản sinh từ `project.yaml` của `ao-sample` giống `settings.json` hiện có của `ao-sample`;
    - test của `kit-copy` với `settings.json` là file sinh lại;
    - `npm run agents:check`.
  - **File:** `scripts/render-agents.mjs`, `lib/agents/` (phần sinh), `quality/gates.yaml`, test.
- [ ] **T5: `/ao-preview` đọc app từ `project.yaml`** (spec 2.1).
  - **Đạt khi:**
    - `preview-run.mjs` lấy app, lệnh `dev`, cổng và URL kiểm từ `project.yaml`;
    - thiếu `project.yaml` thì `/ao-preview` dừng, và bảo chạy `ao-kit sync`;
    - mẫu in khi thiếu cấu hình đổi sang mẫu `project.yaml`;
    - `preview.yaml` không còn được đọc.
  - **Kiểm:** test đỏ trước trong `preview-run.test.mjs` và `steps-preview.test.mjs`.
  - **File:** `lib/workflow/preview.mjs`, `lib/workflow/preview-run.mjs`, `lib/workflow/steps.mjs`, `scripts/ao-step.mjs`, test.
- [ ] **T6: tài liệu chặng 1, PR.**
  - **Đạt khi:** `docs/dev-workflow.md` (mục xem trước) và `README.md` (bảng biến) nói `project.yaml` thay `preview.yaml` và là nguồn của `env`.
  - **Kiểm:** năm lệnh kiểm; CI xanh; PR merge.

### Checkpoint 2: sau T6
- [ ] PR chặng 1 đã merge, `main` xanh.

## Chặng 2: cài kit, nhánh `task/project-scaffold-2`

- [ ] **T7: `install.mjs`** (spec 2.2; plan, quyết định 4, 5).
  - **Đạt khi:**
    - chép đúng các thư mục và file trong `kit_copy.same`, cùng danh sách script của bản chép;
    - thay skill của kit, giữ skill riêng của dự án;
    - giữ `project.yaml`, `deploy.yaml`, `roster.local.yaml`, `settings.local.json`;
    - thêm dòng thiếu vào `.gitignore` và script `prepare`;
    - dự án chưa có `project.yaml` thì dựng file này từ `settings.json`, `preview.yaml`, `deploy.yaml`, rồi xóa `preview.yaml`;
    - danh sách script có test đối chiếu `kit_copy.same`; `misc/scaffold-input/` bị xóa.
  - **Kiểm:** `tests/scaffold/install.test.mjs` trên thư mục tạm thật, gồm một bản sao cấu trúc `ao-sample`.
  - **File:** `lib/scaffold/install.mjs`, test, xóa `misc/scaffold-input/`.
- [ ] **T8: khung `next-nest`, `profiles:check`** (spec 2.6; plan, quyết định 7).
  - **Đạt khi:**
    - `profiles/next-nest/files/` có khung lấy từ `ao-sample` (bỏ tính năng ghi chú), app đọc cổng từ biến môi trường;
    - `profile.yaml` khai app, lệnh, skill, phiên bản Node, việc sau khi chép;
    - `npm run profiles:check` dựng khung vào thư mục tạm rồi chạy `lint`, `typecheck`, `test:coverage`, `build`;
    - workflow `profiles.yml` của kit chạy lệnh này khi PR đụng `profiles/` hay `lib/scaffold/`.
  - **Kiểm:** `profiles:check` xanh trên máy và trong CI; test đọc `profile.yaml`.
  - **File:** `profiles/next-nest/`, `scripts/profiles-check.mjs`, `package.json`, `.github/workflows/profiles.yml`, test.
- [ ] **T9: `ao-kit init`, `sync`, `render`** (spec 2.2, 2.3).
  - **Đạt khi:**
    - **`init` vào thư mục trống:** chép khung của profile, viết `project.yaml`, cài kit, rồi chạy việc sau khi chép;
    - **`init` vào repo đang có:**
      - không đụng code app;
      - viết bản nháp `project.yaml` từ workspace, đánh dấu `TODO` chỗ chưa biết;
      - in danh sách việc còn thiếu (spec 2.3);
    - **`sync --key <KEY>`:** tạo nhánh và commit như plan, quyết định 6; không push;
    - **`render`:** gọi `render-agents.mjs --project`;
    - chạy lại lần hai thì không đổi gì và nói vậy.
  - **Kiểm:** test đỏ trước trong `tests/scaffold/ao-kit.test.mjs`, với effect giả cho `npm` và `git`.
  - **File:** `scripts/ao-kit.mjs`, `lib/scaffold/init.mjs`, test.
- [ ] **T10: tài liệu chặng 2, PR.**
  - **Đạt khi:** `README.md` có lệnh `ao-kit` và `profiles:check`; cấu trúc thư mục có `profiles/` và `lib/scaffold/`.
  - **Kiểm:** năm lệnh kiểm và `profiles:check`; CI xanh; PR merge.

### Checkpoint 3: sau T10
- [ ] PR chặng 2 đã merge, `main` xanh, `profiles.yml` xanh.

## Chặng 3: dựng và kiểm, nhánh `task/project-scaffold-3`

- [ ] **T11: `ao-kit setup github`** (spec 2.4; plan, quyết định 8).
  - **Đạt khi:**
    - lệnh đặt nhánh mặc định `develop`, bật tự xóa nhánh và Dependabot security updates;
    - tạo bốn environment, `merge-gate` chỉ cho `develop`;
    - đặt hai secret qua stdin; chạy `gh:protect`;
    - in từng bước bấm cho hai App và GitHub for Jira;
    - việc đã xong thì bỏ qua.
  - **Kiểm:** test đỏ trước với `gh` giả: thứ tự lệnh, không giá trị bí mật nào trong tham số, chạy lần hai không đổi gì.
  - **File:** `lib/scaffold/setup-github.mjs`, `scripts/ao-kit.mjs`, test.
- [ ] **T12: `ao-kit setup jira`** (spec 2.4, theo kết quả T2).
  - **Đạt khi:** lệnh làm bằng API các bước T2 thấy làm được, in checklist bấm tay cho phần còn lại, rồi chạy `jira:check`.
  - **Kiểm:** test đỏ trước với REST giả, gồm trường hợp API trả 401 hay 403.
  - **File:** `lib/scaffold/setup-jira.mjs`, `scripts/ao-kit.mjs`, test.
- [ ] **T13: `ao-kit doctor`** (spec 2.5; plan, quyết định 9).
  - **Đạt khi:**
    - bảng có các dòng của spec 2.5, mỗi dòng nói đạt hay chưa đạt và việc cần làm;
    - thoát mã 1 khi có dòng chưa đạt;
    - không in giá trị bí mật nào;
    - VPS chỉ có đoạn `deployer.yaml` mẫu và câu hỏi.
  - **Kiểm:** test đỏ trước với máy, `gh`, Jira giả: từng dòng đạt và chưa đạt, và không giá trị bí mật nào trong đầu ra.
  - **File:** `lib/scaffold/doctor.mjs`, `scripts/ao-kit.mjs`, test.
- [ ] **T14: tài liệu chặng 3, PR.**
  - **Đạt khi:** `README.md` mục cài kit nêu ba lệnh mới; `docs/jira-setup.md` (nếu đổi) nói bước nào `setup jira` làm thay.
  - **Kiểm:** năm lệnh kiểm; CI xanh; PR merge.

### Checkpoint 4: sau T14
- [ ] PR chặng 3 đã merge, `main` xanh. Mình báo bạn trước T16.

## Chặng 4: hướng dẫn và kiểm thật

- [ ] **T15: bản nháp `docs/getting-started.md`** (spec 2.7): phần 1 (AO Kit là gì, ai làm gì), 2 (chuẩn bị một lần), 3 (dự án mới), 4 (repo đang có), 6 (bảng tra lệnh). Chưa merge.
- [ ] **T16 [bạn]: kiểm thật dựng mới** (tiêu chí 2), làm đúng theo phần 2 và 3 của bản nháp, từ một thư mục trống.
  - Repo `TungPH7/ao-green` (private), space `AOG`.
  - **Bạn:** cài hai App vào repo, nối GitHub for Jira, tin cậy thư mục, chạy `/ao-intake` cho Task đầu; bấm tạo space và board nếu T2 thấy API không làm được.
  - **Đạt khi:** `doctor` báo mọi dòng đạt, CI xanh trên `develop`, `/ao-status` chạy được.
  - Mỗi chỗ vướng ghi vào `verification.md` và sửa bản nháp. Lỗi của kit sửa bằng PR nhỏ, test đỏ trước.
- [ ] **T17 [bạn]: kiểm thật repo đang có** (tiêu chí 3), làm đúng theo phần 4 của bản nháp.
  - Repo `TungPH7/ao-brown` (private): code của `ao-sample` đã gỡ hết file của kit, chỉ có nhánh `main`. Dùng chung space `AOG`.
  - **Bạn:** cài hai App, nối GitHub for Jira.
  - **Đạt khi:** `init` báo đúng việc còn thiếu; làm xong các việc đó thì `doctor` đạt và CI xanh.
- [ ] **T18 [bạn]: release `v0.2.0` của `ao-sample`.**
  - Các bước: `/ao-release` → gate ④ → `/ao-ship v0.2.0` → gate ⑤ → Production → bấm `Release` → `Complete` `SMP-23`.
  - Ghi lệnh, đầu ra, thời gian, chi phí cho phần 5 của hướng dẫn.
  - **Bạn:** bấm gate ④ và ⑤, `Release`, `Complete`.
- [ ] **T19: bản cuối của hướng dẫn, PR.**
  - **Đạt khi:**
    - đủ bảy phần của spec 2.7, chỉ dùng đầu ra và số liệu thật;
    - phần 5 đi theo `SMP-23` từ `/ao-intake` tới `Complete`;
    - `README.md` mục cài kit chỉ trỏ tới hướng dẫn.
  - **Kiểm:** năm lệnh kiểm; CI xanh; PR merge.

### Checkpoint 5: sau T19
- [ ] Hướng dẫn đã merge. Mình hỏi bạn trước T20.

- [ ] **T20 [bạn]: chép kit vào `ao-sample`** (tiêu chí 4).
  - **Mình:** dùng `/ao-intake` tạo Task chép kit, chạy `ao-kit sync --key <KEY>`, kiểm `project.yaml` sinh ra và việc xóa `preview.yaml`, push, mở PR, chạy `/ao-review`.
  - **Bạn:** đọc báo cáo, approve, tự merge vì PR sửa đường dẫn được bảo vệ.
  - **Đạt khi:** `/ao-preview` trên `ao-sample` chạy được từ `project.yaml`.

## Đóng module

- [ ] **T21: đóng module.**
  - `verification.md` ghi kết quả từng task.
  - Plan, todo, verification dời vào `tasks/archive/project-scaffold-1/`.
  - Cập nhật `SPEC.md`, `SPEC-project-scaffold.md`, `concerns.md` (B1 Xong), memory.
  - Bạn chọn giữ hay xóa `ao-green`, `ao-brown` và space `AOG`.
  - PR tài liệu, tự merge khi CI xanh.
