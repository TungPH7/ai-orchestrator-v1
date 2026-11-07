# Task: kit-copy-review

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-kit-copy-review.md](../../../SPEC-kit-copy-review.md). Làm theo thứ tự. Mỗi task viết test đỏ trước.

**Quy ước:** xong task thì `npm test`, `npm run validate`, `npm run render:check`, `npm run jira:checklist:check` và `npm run agents:check` phải xanh. Nhánh `task/t<N>-<slug>` tách từ `main`, merge qua PR khi CI xanh. Commit theo `CLAUDE.md`. Task có nhãn **[bạn]** cần bạn bấm trên GitHub.

- [x] T1: spec, plan, số liệu bài thử, nhật ký.
- [x] T2: `/ao-fix` không gửi lại ghi chú đã xong; lượt fix chạy tiếp giữ `head` và `note`; `security_review` không phân biệt hoa thường và có thêm đường dẫn.
- [x] T3: thêm ý Cloudflare vào `agents/prompts/security.md`, render lại agent.
- [x] T4: khối `kit_copy` trong `quality/gates.yaml` và schema; `lib/workflow/kit-copy.mjs`.
- [x] T5: `readKitCopy`, `decideReview`, dựng lại file render, đăng báo cáo trên đúng head.
- [x] T6: `docs/quality-gates.md`, `docs/dev-workflow.md`, `docs/release-workflow.md`, `README.md`, `SPEC-dev-workflow.md`.
- [x] T7 **[bạn]**: chép kit vào `ao-pilot`, review đầy đủ ở `max`, bạn merge.
- [x] T8 **[bạn]**: chép cùng bản vào `ao-sample` bằng `Kit review:`; thử một byte khác; bạn merge.
