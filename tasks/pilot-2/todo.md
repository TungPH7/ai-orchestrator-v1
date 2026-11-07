# Task: Pilot 2

> **Plan:** [plan.md](plan.md). **Spec:** [SPEC-pilot-2.md](../../SPEC-pilot-2.md). Làm theo thứ tự.

**Quy ước:** agent chạy lần lượt, chỉ trên `ao-sample` và space `SMP`, có theo dõi mỗi 3 phút. Mỗi lượt agent ghi model, effort, chi phí và thời gian vào [verification.md](verification.md). Lỗi kit sửa ở kit, có test, theo nhánh `task/<slug>` và PR. Task có nhãn **[bạn]** cần bạn bấm.

- [x] T1: spec, plan, nhật ký.
- [x] T2 **[bạn]**: Claude tạo `SMP-17`; bạn Refine nó, cài App `ao-deploy` vào `ao-sample`, Cancel `SMP-3`, `SMP-12`, `SMP-13`, `SMP-14`, `SMP-15`.
- [ ] T3: `SMP-17` qua `/ao-build`, commit của bot, `/ao-review`, `/ao-fix` nếu cần.
- [x] T4 **[bạn]**: VPS cho dự án `sample`; bạn nạp key SSH và mở đăng nhập root, rồi đóng lại.
- [ ] T5 **[bạn]**: gate ③ của `SMP-17`; Development chạy bản đầu, hỏi basic auth, web tạo và đọc được ghi chú.
- [ ] T6 **[bạn]**: `/ao-qa` cho `SMP-4`, `SMP-5`, `SMP-6`, `SMP-7`, `SMP-10`, `SMP-11`, `SMP-16`, `SMP-17`; bạn Accept từng item.
- [ ] T7 **[bạn]**: bạn tạo Fix Version `v0.1.0`, `v0.2.0`; gate ④ `/ao-release v0.1.0`; Staging chạy bản đó.
- [ ] T8 **[bạn]**: `/ao-ship v0.1.0`; bạn approve PR release; Production chạy `v0.1.0`; bạn Release `v0.1.0` và Complete `SMP-2`.
- [ ] T9: `/ao-rollback development`, rồi đưa bản mới về lại.
- [ ] T10: checkpoint cuối, đối chiếu 8 tiêu chí của spec mục 5.
