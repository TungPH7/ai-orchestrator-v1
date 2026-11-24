# Bắt đầu nhanh với AO Kit

> Spec: [SPEC-guided-setup.md](../SPEC-guided-setup.md). Một trang cho dev: cài gì, gõ câu nào, ai làm gì. Từng bước và
> thư mục dự án có gì sau mỗi bước: [setup-steps.md](setup-steps.md). Mọi lệnh, đầu ra thật và lỗi đã gặp:
> [getting-started.md](getting-started.md).

## Bạn làm ba việc

1. **Cài bốn công cụ:** Node.js 24, Git for Windows (có Git Bash), GitHub CLI (`gh auth login`), Claude Code (mở
   `claude` một lần để đăng nhập). Bảng bản và cách kiểm ở mục 2.1 của [getting-started.md](getting-started.md).
2. **Clone kit:**

   ```
   git clone https://github.com/TungPH7/ai-orchestrator-v1 <kit>
   cd <kit> && npm ci
   ```

3. **Tạo một thư mục trống cho dự án**, mở `claude` trong đó, rồi gõ:

   ```
   Làm theo <kit>/ao-kit-setup.md
   ```

Phần còn lại agent chính làm cùng bạn.

## Agent chính làm gì

1. **Hỏi bạn config**, mỗi câu có sẵn giá trị đề xuất: stack (khung `next-nest` của kit, hay app từ template của bạn),
   tên dự án, space Jira, repo, review, số làn, số agent, ngân sách, có lên VPS không. Bạn duyệt một bảng tổng hợp, rồi
   agent mới ghi file.
2. **Kiểm phần chuẩn bị một lần:** token, GitHub App, site Jira, VPS. Thiếu gì thì agent dẫn bạn làm từng bước.
3. **Chạy các lệnh `ao-kit`:** tạo repo, dựng khung, thêm app từ template, dựng space Jira, commit đầu, dựng phần GitHub.
4. **Dẫn bạn bấm** những việc chỉ bạn làm được, rồi chờ bạn báo xong.
5. **Chạy `doctor`** tới khi mọi dòng xanh, rồi **chạy `verify`:** ghi thử lên Jira, GitHub và VPS, rồi dọn lại.

## Những việc chỉ bạn làm được

| Việc | Khi nào |
|---|---|
| Đặt token và key làm biến môi trường của Windows. Không bao giờ dán chúng vào chat | Lần đầu, hoặc khi agent báo thiếu |
| Sửa cột và giới hạn cột của board Jira | Sau khi agent dựng space |
| Tạo key của `ao-merge`, rồi xóa file key sau khi lệnh chạy | Khi agent dựng phần GitHub |
| Cài App vào repo, bật Actions | Chỉ khi API không làm được |
| Đóng rồi mở lại Claude Code, tin cậy thư mục, bật hai server MCP | Cuối phiên thứ nhất |

## Hai phiên Claude Code

Claude Code chỉ nạp cài đặt của dự án khi bạn mở lại nó trong thư mục. Vì vậy setup có hai phiên:
- **Phiên 1:** từ thư mục trống tới commit đầu và CI lần đầu.
- **Phiên 2:** bạn gõ `/exit`, mở lại `claude` trong thư mục, tin cậy thư mục, chọn **Enable selected** cho hai server
  MCP, rồi gõ `làm tiếp ao-kit-setup.md`.

Bạn dừng lúc nào cũng được: gõ câu đó ở phiên mới, agent đọc `.ai/setup/` và `doctor` để biết đã làm tới đâu.

## Xong setup

Thư mục có đủ kit, CI xanh trên `develop`, space Jira sẵn sàng, và (nếu bạn chọn) các app chạy trên Development. Việc
đầu tiên bắt đầu bằng `/ao-intake` ([getting-started.md](getting-started.md) phần 6).
