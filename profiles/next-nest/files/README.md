# __TITLE__

`apps/web` (Next.js) và `apps/api` (NestJS) trong một npm workspace, dựng bằng `ao-kit init` của [ai-orchestrator](https://github.com/TungPH7/ai-orchestrator-v1), profile `next-nest`.

## Chạy ở máy

```
npm ci
npm run dev            # web ở http://localhost:3000, api ở http://localhost:3001
```

Mỗi app đọc cổng từ biến `PORT`, nên chạy được hai bản trên hai cổng khác nhau.

## Kiểm tra

```
npm run lint
npm run typecheck
npm run test:coverage  # unit test và integration test, ghi coverage/lcov.info
npm run build
npm run test:e2e       # Playwright tự bật hai app
```

CI chạy bốn lệnh đầu trên mọi PR. Cách làm việc với kit nằm ở `docs/getting-started.md` của repo kit.
