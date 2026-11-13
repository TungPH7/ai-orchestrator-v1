# Kiểm thật: project-scaffold, phần 2 (B2)

> **Spec:** [SPEC-project-scaffold-2.md](../SPEC-project-scaffold-2.md). **Plan:** [plan.md](plan.md). **Task:** [todo.md](todo.md).

## T1 (2026-11-13)

Kit PR #261 (`9fdeb20`): spec đã duyệt, plan, todo, nhật ký Lượt 198–200.

## Chặng 1: pnpm (T2–T6), nhánh `task/scaffold2-1`

**T2.** `lib/quality/package-manager.mjs` là chỗ duy nhất biết npm hay pnpm. Trên máy Windows của bạn có hai bản pnpm 11.8.0:
- shim của corepack trong thư mục Node, gọi `node_modules/corepack/dist/pnpm.js`; shim này lấy đúng bản mà `packageManager` ghi;
- gói `pnpm` cài toàn cục, `node_modules/pnpm/bin/pnpm.cjs`.

Module tìm gói toàn cục trước, rồi tới corepack, và chạy bằng `node`, không qua shell. Test chạy `pnpm --version` thật qua đường này. Luật mới C4 của `ao-kit check`: lockfile ở gốc phải khớp `package_manager`, và dự án pnpm phải ghi `packageManager`.

**T3.** `pnpm audit --json` của pnpm 11.8.0 trả về dạng cũ, kiểu npm 6 (`advisories` theo id, `module_name`), khác `npm audit` (`vulnerabilities`, `via`). Kết quả này có được khi chạy thử trên template React của bạn. `auditProblems` đọc được cả hai dạng.

**Cần làm ở T22:** template React hiện có 47 cảnh báo high và 1 critical (`pnpm audit`, ngày 2026-11-13; ví dụ `brace-expansion`, GHSA-3jxr-9vmj-r5cp). Với ngưỡng `audit_level: high` của `gates.yaml`, job `policy` của `shop` sẽ đỏ cho tới khi các dependency được nâng bản, hoặc thêm `overrides`, hoặc có ngoại lệ có hạn.

**T4.** `/ao-preview` cài bằng `pnpm install --frozen-lockfile --ignore-scripts` khi `pnpm-lock.yaml` khác lần cài trước, và chạy app qua `pnpm.cjs`. Thông báo của dự án npm giữ nguyên chữ. Phần cài trong worktree của `qa` nằm thẳng trong `scripts/ao-step.mjs` (`addWorktree`), nên chưa có test riêng. Phần đó dùng `managerFromLockfile` và `installArgs`, vốn đã có test; lần chạy thật đầu tiên sẽ là `/ao-qa` trên `shop`.

**T5.** Thử thật profile `base-pnpm` trên thư mục tạm: `pnpm install` dùng pnpm 11.8.0, tạo `pnpm-lock.yaml` trong khoảng 5 giây. `pnpm -r run lint` khi chưa có app in "No projects matched the filters" và thoát mã 0. `.gitignore` của profile giữ `.env.example`, vì template của bạn commit file này.

## Chặng 2: stack và `ao-kit add` (T7–T13), nhánh `task/scaffold2-2`

**Luật cổng (Lượt 203):** bạn đồng ý thêm `**/pnpm-workspace.yaml` vào `security_review.roster_effort_paths`.

**T7–T9.** `profiles:check` dựng `base-pnpm` cùng app `web` (stack `nextjs`) và app `admin` (stack `react`):
- `pnpm install` mất 186 giây ở lần tải gói đầu tiên;
- lint, typecheck, test:coverage, build đều xanh;
- `next-nest` vẫn qua đủ năm bước, chạy qua `runManager`.

Skill `vercel-react-best-practices` không chép thêm bản nào: `add` lấy nó ở `profiles/next-nest/files/.claude/skills/` (`findSkill`).

**T10–T11, thử trên hai template thật của bạn** (Next.js `2660424f`, React `06f0cf54`), trong một dự án tạm:
- `copyTemplate` chép 237 và 170 file, bỏ `study-guide-impl/`, `frontend-technical/`, `docs/readme/`. Các thư mục và file bị bỏ: `.husky/`, `.commitlintrc.json`, `.github/`, `.nvmrc`, `playwright.config.ts`, lockfile, workspace. `CLAUDE.md` thành skill `user-conventions` và `admin-conventions`.
- `pnpm-workspace.yaml` ở gốc gộp đủ `allowBuilds` của hai template (`sharp: true`; `unrs-resolver`, `msw`, `esbuild`, `@parcel/watcher`, `@swc/core`: `false`) và `minimumReleaseAgeExclude: [lint-staged]`, không xung đột.
- `pnpm install` 81 giây; lint xanh.
- **Typecheck đỏ ở `apps/user/e2e/accessibility.spec.ts`:** repo có hai bản Playwright, 1.64.1 ở gốc (`base-pnpm`) và 1.61.0 ở template. Đã sửa trong `template.mjs`: gốc lấy bản của template đầu tiên, app sau lấy bản của gốc.
- `test:coverage` xanh, 98 giây, nhưng `apps/admin/coverage/` không có `lcov.info`. `add` báo đúng chỗ này.
- **Build đỏ ở `apps/user`:** schema env của template (`src/config/env/client.ts`) đòi `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_SITE_URL` lúc build. `add` báo hai biến này; việc sửa thuộc T23, và CI cũng cần chúng có giá trị chung cho ba môi trường.
- `rm -rf .next` trong script `dev` và `build` của template chạy được qua pnpm trên Windows.
