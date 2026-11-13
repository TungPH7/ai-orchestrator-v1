# Plan triển khai: project-scaffold, phần 1 (B1)

> **Spec:** [SPEC-project-scaffold.md](../../../SPEC-project-scaffold.md), đã duyệt 2026-11-12 (Phiên 27 · Lượt 154). **Trạng thái:** đã duyệt 2026-11-12 (Phiên 27 · Lượt 155); hoàn thành 2026-11-13 (Lượt 198), kết quả ở [verification.md](verification.md). **Danh sách task:** [todo.md](todo.md).

## Tổng quan

Phần 1 chia bốn chặng. Gọi là "chặng" để khỏi nhầm với phần 1, 2, 3 của module:
- **Chặng 1, cấu hình:** `project.yaml`, `ao-kit check`, sinh `settings.json`, `/ao-preview` đọc app từ `project.yaml`.
- **Chặng 2, cài kit:** `ao-kit init`, `sync`, `render`; profile `next-nest`.
- **Chặng 3, dựng và kiểm:** `ao-kit setup github`, `setup jira`, `doctor`.
- **Chặng 4, hướng dẫn và kiểm thật:**
  - viết `docs/getting-started.md`;
  - dựng mới và cài vào repo đang có, làm đúng theo hướng dẫn;
  - release `v0.2.0` của `ao-sample`;
  - chép kit mới vào `ao-sample`.

Task đầu kiểm tiền đề Jira, vì kết quả quyết định `setup jira` làm được tới đâu.

## Quyết định kiến trúc

1. **Mỗi chặng code một nhánh và một PR, mỗi task một commit.** Nhánh `task/project-scaffold-<N>` tách từ `main`. Mình tự merge khi CI xanh, như các PR kit trước.
2. **Hàm thuần trong `lib/scaffold/`, effect truyền vào.** `scripts/ao-kit.mjs` chỉ ghép tham số và gọi lib. `git`, `gh`, REST Jira, hệ thống file và tiến trình con đều là tham số, nên test không gọi mạng.
3. **`settings.json` sinh trong `render-agents.mjs`,** không ở script riêng. `kit-copy-review` đã dùng `render-agents.mjs --check` và `--list` để kiểm các file sinh lại của PR chép kit (`renderCheck` trong `ao-step.mjs`). Vì vậy:
   - `.claude/settings.json` vào danh sách `kit_copy.rendered` của `gates.yaml`;
   - `settings.json` sinh ra = bản `kit/.claude/settings.json`, cộng `env` và `claude.allow` lấy từ `project.yaml`;
   - dự án chưa có `project.yaml` thì giữ cách cũ, đọc `env` của `settings.json`, để bản chép kit cũ vẫn chạy.
4. **`sync` chuyển dự án cũ sang `project.yaml`.** Dự án chưa có file này thì `sync` dựng nó từ `env` của `settings.json`, `preview.yaml` và `deploy.yaml`, rồi xóa `preview.yaml`. `ao-sample` đi đường này ở T20.
5. **Danh sách file của kit nằm ở một chỗ.** `install.mjs` lấy thư mục và file từ `kit_copy` của `gates.yaml`. Danh sách script của bản chép, hiện nằm trong `misc/scaffold-input/kit-copy.mjs`, chuyển vào `install.mjs`, có test đối chiếu với `kit_copy.same`. Sau đó xóa `misc/scaffold-input/`.
6. **`sync` không push.** Lệnh nhận `--key <KEY>` của Task chép kit, tạo nhánh `feature/<KEY>-kit-copy` từ `origin/develop`, rồi commit `chore(kit): copy the kit at <sha> (<KEY>)`. Push và mở PR là bước bạn làm, hoặc Claude làm cho bạn, như PR chép kit hiện nay.
7. **Khung app là file ghim trong `profiles/next-nest/files/`,** lấy từ `ao-sample` nhưng bỏ tính năng ghi chú. Khung có khoảng 36 file app, cộng file gốc.
   - `npm run profiles:check` dựng khung vào thư mục tạm, rồi chạy `lint`, `typecheck`, `test:coverage`, `build`.
   - Lệnh chạy trong một workflow riêng của kit, `profiles.yml`, chỉ khi PR đụng `profiles/` hay `lib/scaffold/`, vì nó cài package mất vài phút.
8. **Secret chỉ đi qua stdin.** `setup github` đọc `JIRA_CI_TOKEN` từ biến môi trường hay biến user Windows, và đọc key của `ao-dev` từ file. Giá trị được đưa vào `gh secret set` qua stdin, không qua tham số, không in ra.
9. **`doctor` chỉ đọc,** thoát mã 1 khi có dòng chưa đạt. Biến bí mật chỉ được xét có hay không và hình dạng, không bao giờ in giá trị.
10. **Hướng dẫn viết hai lượt.**
    - Bản nháp phần 1–4 và 6 viết trước kiểm thật, để T16, T17 làm đúng theo nó.
    - Bản cuối viết sau, chép đầu ra thật, và sửa mọi chỗ kiểm thật thấy sai.

## Task

| Task | Nội dung | Chặng, nhánh |
|---|---|---|
| T1 | Spec duyệt, plan, todo, nhật ký | PR tài liệu |
| T2 | **[bạn]** Tiền đề Jira: tạo space `AOG` và gán scheme bằng API token thường | Không có code |
| T3 | `project.yaml`: schema, đọc, kiểm; `ao-kit check` đối chiếu `deploy.yaml`, `package.json` | Chặng 1 |
| T4 | `render-agents.mjs` sinh `settings.json`; `kit_copy.rendered` | Chặng 1 |
| T5 | `/ao-preview` đọc app từ `project.yaml` | Chặng 1 |
| T6 | Tài liệu chặng 1; PR | Chặng 1 |
| T7 | `install.mjs`: chép kit, giữ file dự án, chuyển dự án cũ sang `project.yaml` | Chặng 2 |
| T8 | Khung `next-nest` và `profiles:check` | Chặng 2 |
| T9 | `ao-kit init` (thư mục trống và repo đang có), `sync`, `render` | Chặng 2 |
| T10 | Tài liệu chặng 2; PR | Chặng 2 |
| T11 | `ao-kit setup github` | Chặng 3 |
| T12 | `ao-kit setup jira`, theo kết quả T2 | Chặng 3 |
| T13 | `ao-kit doctor` | Chặng 3 |
| T14 | Tài liệu chặng 3; PR | Chặng 3 |
| T15 | Bản nháp `docs/getting-started.md`, phần 1–4 và 6 | Chặng 4 |
| T16 | **[bạn]** Kiểm thật dựng mới: thư mục trống → `TungPH7/ao-green`, space `AOG` | Chặng 4 |
| T17 | **[bạn]** Kiểm thật repo đang có: `TungPH7/ao-brown`, code `ao-sample` đã gỡ kit | Chặng 4 |
| T18 | **[bạn]** Release `v0.2.0` của `ao-sample`, `Complete` `SMP-23` | `ao-sample` |
| T19 | Bản cuối của hướng dẫn, bảy phần; `README.md`; PR | Chặng 4 |
| T20 | **[bạn]** `ao-kit sync` vào `ao-sample`, review đầy đủ, bạn merge | `ao-sample` |
| T21 | Đóng module | PR tài liệu |

T18 không phụ thuộc code của module, nên làm được bất cứ lúc nào sau T1, khi bạn rảnh để bấm gate ④ và ⑤.

**Checkpoint:**
- **Checkpoint 1**, sau T2: kết quả tiền đề Jira. Nếu API không làm được việc gì, mình sửa mục 2.4 của spec, và bạn duyệt bản sửa trước T12.
- **Checkpoint 2**, sau T6: PR chặng 1 merge, năm lệnh kiểm xanh.
- **Checkpoint 3**, sau T10: PR chặng 2 merge, `profiles:check` xanh trong CI của kit.
- **Checkpoint 4**, sau T14: PR chặng 3 merge. Mình báo bạn trước T16, vì từ đây cần bạn bấm trên GitHub và Jira.
- **Checkpoint 5**, sau T19: hướng dẫn merge. Mình hỏi bạn trước T20, vì T20 tốn tiền.

## Chi phí

| Task | USD [Ước] |
|---|---|
| T1–T17, T19, T21 | 0 tiền agent. T16, T17 chỉ dùng phiên chính để chạy `/ao-intake` và `/ao-status` |
| T18 | 1–2: `qa` regression và `devops` release notes (`v0.1.0` tốn 1,04) |
| T20 | 13–23: review đầy đủ PR chép kit, `security` ở `max` |

## Rủi ro

| Rủi ro | Mức | Cách xử lý |
|---|---|---|
| Jira không cho tạo space hay gán scheme bằng API | Trung bình | T2 kiểm trước; phần nào không được thì giữ checklist bấm tay |
| `settings.json` sinh ra khác bản dự án đang dùng | Thấp | `ao-sample` hiện chỉ khác bản kit ở `env`; test so bản sinh ra với `settings.json` của `ao-sample` |
| Đổi `kit_copy.rendered` làm hỏng đường review nhanh của PR chép kit | Trung bình | Test của `kit-copy` với `settings.json` trong danh sách sinh lại; T20 kiểm thật |
| Khung app chạy được trên máy nhưng đỏ trong CI, hay ngược lại | Trung bình | `profiles:check` chạy trong CI của kit; T16 dựng thật rồi xem CI của repo mới |
| Cài package của khung mất vài phút, làm CI của kit chậm | Thấp | Workflow riêng, chỉ chạy khi PR đụng `profiles/` hay `lib/scaffold/` |
| Hướng dẫn sai ở bước mà chỉ người mới thấy | Trung bình | T16, T17 làm đúng theo bản nháp; mỗi chỗ vướng ghi vào `verification.md` rồi sửa hướng dẫn |
| Hai repo và một space thử làm rác tài khoản | Thấp | Repo private; cuối module bạn chọn giữ hay xóa |

## Câu hỏi mở

Không có. T2 cần bạn tạo một API token thường của Atlassian (không scope) và đặt làm biến môi trường; mình sẽ ghi từng bước bấm khi tới đó. T16 và T17 cần bạn bấm cài hai App và nối GitHub for Jira cho hai repo mới.
