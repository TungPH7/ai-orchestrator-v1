# Plan triển khai: project-scaffold, phần 2 (B2)

> **Spec:** [SPEC-project-scaffold-2.md](../SPEC-project-scaffold-2.md), đã duyệt 2026-11-13 (Phiên 27 · Lượt 201). **Trạng thái:** viết ở Lượt 201. Quyền tự làm theo đề xuất (Lượt 181) áp dụng cho B2, nên plan không chờ duyệt riêng; bạn muốn đổi gì thì nói lúc nào cũng được. **Danh sách task:** [todo.md](todo.md).

## Tổng quan

Phần 2 chia năm chặng. Bốn chặng đầu là code của kit, mỗi chặng một PR; chặng cuối là kiểm thật và hướng dẫn:
- **Chặng 1, pnpm:** `package_manager` trong `project.yaml`; CI, `/ao-preview`, worktree của `ao-step`, `init` và `doctor` chạy theo trường này.
- **Chặng 2, stack và `ao-kit add`:** stack `nextjs` (pnpm) và `react`; phần gốc của dự án pnpm; chép template; `setup github` cho repo public.
- **Chặng 3, nhiều app công khai:** luật D2, `deployer.yaml` có host theo app, deployer, Caddy, `qa`.
- **Chặng 4, ảnh chụp và design system:** `check-design` (D7 mới, D9), template `design.md`, prompt của `ux`, `sa`, `fe-dev`, `qa`.
- **Chặng 5, kiểm thật và hướng dẫn:** cập nhật kit trên VPS, dựng repo `shop`, Development chạy hai host, bản cuối của hướng dẫn.

Chặng 1 đi trước, vì mọi chặng sau đều cài package bằng pnpm. Chặng 3 và chặng 4 không phụ thuộc nhau.

## Quyết định kiến trúc

1. **Mỗi chặng code một nhánh và một PR, mỗi task một commit.** Nhánh `task/scaffold2-<N>` tách từ `main`. Mình tự merge khi CI xanh, như các PR kit trước.
2. **Hàm thuần, effect truyền vào,** như phần 1. `scripts/ao-kit.mjs` chỉ ghép tham số và gọi lib.
3. **Chỉ một chỗ biết npm hay pnpm:** `lib/quality/package-manager.mjs`. Nó trả về tên lockfile, lệnh cài (thường và `--ignore-scripts`), lệnh chạy script, dạng lệnh `dev`, lệnh audit, và cách chạy không qua shell.
   - Trên Windows, `pnpm` là file `.cmd`. Module tìm file JS của pnpm (`pnpm.cjs`), như `npm.mjs` tìm `npm-cli.js`, rồi chạy bằng `node`. Không tìm thấy thì dừng, và nói cách cài đúng bản.
   - Package của chính kit trong `.ai-orchestrator/` vẫn cài bằng npm.
4. **CI nhận ra pnpm qua lockfile ở gốc,** trong bash. Bản pnpm lấy từ `packageManager` của `package.json`, bỏ phần hash sau dấu `+` nếu có, rồi cài bằng `npm install -g pnpm@<bản>`. Cách này không cần thêm action mới phải ghim. `ao-kit check` thêm luật: `package_manager` khớp lockfile, và dự án pnpm có `packageManager`.
5. **Bố cục của profile:**
   - `profiles/base-pnpm/` là profile không có app: phần gốc của dự án pnpm, cho `init --package-manager pnpm`;
   - `profiles/stacks/<stack>/` có `stack.yaml` và `files/`, cho `add`;
   - `readProfile` chỉ nhận thư mục có `profile.yaml`, nên bỏ qua `stacks/`;
   - `profiles:check` dựng `next-nest` như hiện nay, và dựng thêm một dự án pnpm gồm `base-pnpm` cùng hai stack, như dự án thật sẽ có.
6. **Chép template giống `git archive`:** chỉ file đã commit ở `HEAD`. `add` clone template bằng `git clone --depth 1` vào thư mục tạm, rồi chép cây đó (trừ `.git/`) vào `apps/<app>`. Template không bị đổi gì. Template có thay đổi chưa commit thì lệnh in ra, vì phần đó không được chép.
7. **`CLAUDE.md` của template thành skill** `.claude/skills/<app>-conventions/SKILL.md`. Đầu file ghi rằng luật của kit thắng skill; phần thân là nội dung `CLAUDE.md`. Skill được gán cho `fe-dev` trong `roster.local.yaml`.
8. **Hai dạng `hosts` trong `deployer.yaml` phân biệt bằng kiểu giá trị:** chuỗi là dạng cũ (một host cho mỗi môi trường); object là dạng theo app. Không dựa vào tên khóa, vì một app có thể tên là `staging`.
9. **`qa` đọc host từ `project.yaml` của chính commit đang chạy trên môi trường đó** (`git show <sha>:.ai-orchestrator/project.yaml`), không đọc từ nhánh đang mở.
10. **Hướng dẫn viết hai lượt,** như phần 1: bản nháp trước kiểm thật để T22 làm đúng theo nó, bản cuối sau, với đầu ra thật.
11. **Skill theo stack không chép thêm bản nào** (thêm ở T7). `stack.yaml` nêu tên skill, và `add` lấy skill ở chỗ kit đang giữ: `profiles/stacks/<stack>/skills/` trước, rồi `.claude/skills/` của một profile. Ví dụ `vercel-react-best-practices` (418 KB) nằm ở `profiles/next-nest/files/.claude/skills/`.
12. **Một bản Playwright cho cả repo** (thêm ở T11, sau khi thử trên hai template thật). `playwright.config.ts` ở gốc chạy `e2e/` của mọi app. Khi chưa app nào ghim bản, gốc lấy bản của template; sau đó app lấy bản của gốc.
13. **Việc trên VPS:** mỗi bước mình hỏi bạn ngay trước khi làm. Chỉ phiên chính SSH. Không in file chứa thông tin đăng nhập, như Caddyfile hay file basic auth.

## Task

| Task | Nội dung | Chặng |
|---|---|---|
| T1 | Spec duyệt, plan, todo, nhật ký Lượt 198–201 | PR tài liệu |
| T2 | `package-manager.mjs`; `package_manager` trong `project.yaml`; luật của `ao-kit check` | 1 |
| T3 | CI: `build-test` và `policy` cho pnpm; `check-policy` chạy `pnpm audit` | 1 |
| T4 | `/ao-preview` và worktree của `ao-step` cho pnpm | 1 |
| T5 | `init --package-manager pnpm` (profile `base-pnpm`), `init` cho repo pnpm đang có, `doctor` kiểm bản pnpm | 1 |
| T6 | Tài liệu chặng 1; PR | 1 |
| T7 | Stack `nextjs` (pnpm) | 2 |
| T8 | Stack `react` | 2 |
| T9 | `profiles:check` cho dự án pnpm | 2 |
| T10 | Chép template: bỏ phần kit thay thế, gộp cài đặt pnpm, `CLAUDE.md` thành skill | 2 |
| T11 | `ao-kit add`: cấu hình, Dockerfile, cài, báo chỗ code app phải đổi | 2 |
| T12 | `setup github` cho repo public; `doctor` báo hạn của giới hạn tương tác | 2 |
| T13 | Tài liệu chặng 2; PR | 2 |
| T14 | D2 mới; `hosts` theo app trong `deployer.yaml` và `project.yaml`; `check`, `doctor` | 3 |
| T15 | Deployer, Caddy, bản ghi: nhiều app công khai | 3 |
| T16 | `qa`: `E2E_<APP>_URL`; `/ao-status`; Playwright ở gốc đọc `project.yaml` | 3 |
| T17 | Tài liệu chặng 3; PR | 3 |
| T18 | `check-design`: D7 mới, D9; template `design.md` | 4 |
| T19 | Prompt `ux`, `sa`, `fe-dev`, `qa`; template plan; PR | 4 |
| T20 | Bản nháp phần mới của hướng dẫn | 5 |
| T21 | **[bạn]** VPS: đo RAM, cập nhật kit, chạy `--dry-run` | 5 |
| T22 | **[bạn]** Dựng repo `shop` theo hướng dẫn, tới khi `doctor` đạt và CI xanh | 5 |
| T23 | **[bạn]** Task và PR sửa code app theo báo cáo của `add`; `/ao-preview` | 5 |
| T24 | **[bạn]** Development của `shop` chạy hai host; đo RAM lần nữa | 5 |
| T25 | Bản cuối của hướng dẫn; PR | 5 |
| T26 | Đóng module | PR tài liệu |

**Checkpoint:**
- **Checkpoint 1**, sau T6: PR chặng 1 merge; năm lệnh kiểm xanh; các dự án npm không đổi hành vi.
- **Checkpoint 2**, sau T13: PR chặng 2 merge; `profiles:check` xanh trong CI của kit, với dự án pnpm.
- **Checkpoint 3**, sau T17 và T19: hai PR merge; Caddyfile của dự án một app giống hệt bản cũ.
- **Checkpoint 4**, sau T24: tiêu chí 2, 3, 4 của spec đạt.
- **Checkpoint 5**, sau T26: đủ sáu tiêu chí ở mục 7 của spec.

## Rủi ro

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Không tìm được file JS của pnpm trên Windows để chạy không qua shell | Cao: `/ao-preview` và `add` không chạy | Tìm theo thứ tự: cài toàn cục bằng npm, corepack, bản cài riêng. Test với các cách cài. Không thấy thì dừng và nói cách cài |
| pnpm 11 trên CI chặn script cài, hoặc chặn gói mới phát hành | Trung bình: `build-test` đỏ | `pnpm-workspace.yaml` ở gốc mang `allowBuilds` và `minimumReleaseAgeExclude` của template; T9 chạy cả hai stack trên CI của kit |
| Template Next.js có script dùng lệnh shell (`rm -rf .next`) | Thấp: `dev` có thể hỏng trên Windows | T23 kiểm thật; nếu hỏng, `add` báo, và sửa trong PR của T23 |
| Đổi deployer làm hỏng `ao-sample`, `ao-pilot` | Cao | Hai dạng `hosts`; test so Caddyfile; `--dry-run` trên VPS trước; giữ bản kit cũ trên VPS để quay lại |
| VPS thiếu RAM | Trung bình | Đo trước (T21) và sau (T24); chỉ Development của `shop` |
| Task sửa code app của T23 không tới được Done, vì PR do người mở | Thấp | Đã biết từ B1 (`AOG-3`): Cancel Task, comment trỏ tới PR |

## Chi phí

Phần 2 không gọi agent trả tiền. Phần ảnh chụp và design system được kiểm thật lần đầu ở Epic đầu của B4.
