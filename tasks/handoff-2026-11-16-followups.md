# Việc kit rút ra từ kiểm thật C2 trên shop (2026-11-16)

- [x] Chốt RAM: lệnh chỉ giữ khóa không giữ RAM; agent chờ RAM chỉ khi lệnh khác đã bật agent (kit PR #300).
- [x] Lượt build dừng vì giới hạn 5 giờ trước khi có ledger vẫn chạy tiếp trong session (kit PR #301).
- [ ] `prune` trên Windows: `git worktree remove --force` báo "Directory not empty" khi một file trong làn đang bị tiến trình giữ (SHOP-13, 01:25). Git đã gỡ worktree nhưng thư mục còn sót (`node_modules`, file gốc) và vẫn bị đếm là làn đang mở theo `runs.lanes_max`. Sửa: thử lại sau vài giây; ở lần prune sau, xóa thư mục `<KEY>` mà git không còn biết là worktree, nếu nó không có thay đổi chưa đẩy. Lần này Claude xóa tay phần còn sót (xóa được ngay ở lần thứ hai).
- [ ] Lần đầu `/ao-build SHOP-13` dừng "Docker is not running" dù `docker info` vừa trả lời: kiểm Docker của `ao-step` có thể thử lại một lần trước khi dừng.
- [ ] Hạ `runs.min_free_ram_gb` của shop xuống 1,5 (bạn đồng ý ở Lượt 48), gộp vào lần chép kit kế tiếp cùng kit PR #299, #300, #301.
- [ ] SHOP-38: ghi kết quả kiểm thật C2 lên item, gỡ cờ, chạy lại `/ao-qa SHOP-38`. Kết quả: hai lệnh giữ khóa cùng lúc; mỗi item làm trong làn riêng; thư mục `shop` đứng yên ở `develop`; hai agent chạy song song thật (01:17, `fe-dev` SHOP-11 cùng `security` PR #23); preview chỉ đúng thư mục làn; chốt RAM giữ agent thứ hai khi RAM dưới ngưỡng.
- Container `learn-postgres` đang chạy là database của bạn ở thư mục `shop`, do Docker Desktop tự bật lại (restart unless-stopped); không phải của làn.
