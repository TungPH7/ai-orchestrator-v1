# Kiểm chứng: Pilot 2

Ghi theo ngày: bước, kết quả, bằng chứng. Mỗi lượt agent ghi model, effort, chi phí và thời gian.

## Hiện trạng lúc bắt đầu, 2026-11-07

- `ao-sample`: `develop` ở `22a0213` (bản chép kit `0edf8df`, PR #14), đi trước `main` 13 commit; chưa có tag. Còn hai workflow giả `deploy.yml` và `audit.yml`; deployment `development` gần nhất là `22a0213` của workflow giả.
- Jira `SMP`: Epic `SMP-2` In Progress; `SMP-4`, `SMP-5`, `SMP-6`, `SMP-7`, `SMP-10`, `SMP-11`, `SMP-16` ở Ready for QA; 5 Task chép kit cũ ở New; chưa có Fix Version nào.
- VPS: deployer chỉ có dự án `pilot`, bản kit `521e031`. DNS wildcard `*.ao.t2g.io.vn` đã trỏ về VPS.
- App: API giữ ghi chú trong bộ nhớ; web chuyển `/api/notes` tới `API_URL` bằng `rewrites()`; `e2e/notes/create-note-api.spec.ts` gọi thẳng `http://localhost:3001/notes`.
