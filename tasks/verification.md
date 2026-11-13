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
