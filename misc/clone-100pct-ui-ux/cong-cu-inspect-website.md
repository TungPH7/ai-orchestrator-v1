# Công cụ inspect website mẫu để làm đúng UI/UX

Bạn hỏi ở Phiên 32 · Lượt 8 (2026-11-15), trong lúc `sa` lập plan cho Epic `SHOP-7` của Pilot 3. Trang mẫu là
https://demo.codeandchill.store/vitrea/. Ở T11 (Phiên 30), mình đo trang này bằng script Playwright `ref-capture.mjs`,
và kết quả nằm ở `shop/.ai/design-inbox/_reference/`.

## 1. Playwright có thao tác như người dùng được không?

**Có.** Playwright điều khiển một trình duyệt thật, nên làm được gần hết việc một người dùng làm:

1. **Thao tác:** click, hover, focus, gõ phím, kéo thả, cuộn bằng con lăn, bấm phím tắt, mở hộp thoại.
2. **Giả lập môi trường:** cỡ màn hình (điện thoại 375 px, máy tính bảng 768 px), `prefers-color-scheme` (sáng/tối),
   `prefers-reduced-motion`, mật độ điểm ảnh.
3. **Ghi lại:** chụp cả trang hay từng phần tử, quay video, ghi trace (xem lại từng bước, có DOM và network).
4. **Đọc trang:** chạy JavaScript trong trang, như `getComputedStyle`, `document.getAnimations()`, và đọc các stylesheet.

**Lỗi của mình ở T11:** script chỉ đo giao diện tối, không bấm nút đổi giao diện. Vì vậy `ux` phải tự suy ra bảng
màu sáng. Ảnh `05-app-detail.png` cũng sai: script chỉ đổi phần sau dấu `#` của đường dẫn mà không bấm vào thẻ app, nên
chụp nhầm trang Overview.

**Đã thử lại hôm nay** (`scratchpad/ref-light-probe.mjs`):

- Script tìm nút "Switch to light theme" và bấm nó. `data-theme` của trang đổi từ `dark` sang `light`.
- Trang có 103 token CSS. Ở giao diện sáng, 75 token có giá trị khác với giao diện tối. Ví dụ:

  | Token | Tối | Sáng |
  |---|---|---|
  | `--bg` | `#111113` | `#e4e6ea` |
  | `--accent-text` | `#a9cdfc` | `#1d5cb0` |
  | `--line` | `#ffffff1a` | `#14161e1a` |
  | `--surface` | `#1e1e226b` | `#ffffff61` |

- Có 4 ảnh giao diện sáng (`01-growth`, `03-apps-list`, `04-overview` và `05-app-detail`, lần này chụp đúng trang chi
  tiết) cùng `light.json` chứa đủ 103 token. Tất cả nằm ở `shop/.ai/design-inbox/_reference/light/`.

**Hệ quả cho `SHOP-7`:** bảng màu sáng trong `design.md`, mà bạn đã duyệt ở gate ①, là bảng `ux` suy ra. Giờ đã có
số đo thật, nên có hai cách:

- **(a)** Giữ bảng của `ux`.
- **(b)** Dùng bảng sáng thật của trang mẫu. Chỗ nào trang mẫu chưa đạt WCAG AA thì giữ sửa đổi của `ux`, như đã làm
  với giao diện tối.

Cách (b) sửa một thiết kế đã duyệt, nên bạn là người quyết.

**T11 còn thiếu những gì**, nếu muốn bám sát trang mẫu:

- trạng thái hover, focus, active và disabled của nút, ô nhập và thẻ;
- bố cục ở 375 px và 768 px;
- hộp thoại, menu, toast;
- trạng thái trống và đang tải;
- animation và hiệu ứng khi cuộn.

Playwright làm được tất cả các việc trên.

## 2. Claude in Chrome có dùng được trong Claude Code không?

**Có.** Claude Code CLI điều khiển được extension Claude in Chrome. Các điểm dưới đây theo tài liệu chính thức,
https://code.claude.com/docs/en/chrome:

1. **Cách bật:**
   - chạy `claude --chrome`;
   - hoặc gõ `/chrome` trong Claude Code rồi chọn **Enabled by default**.
2. **Điều kiện:**
   - extension từ bản 1.0.36 trở lên;
   - đăng nhập Claude Code bằng `/login`; nếu dùng API key thì tính năng tự tắt;
   - gói Pro dùng được;
   - chạy được trên Windows, nhưng không qua WSL;
   - trình duyệt Chrome (Edge cũng được nêu).
3. **Làm được** theo tài liệu:
   - mở trang, click, gõ, cuộn;
   - đọc console và DOM;
   - chụp màn hình, ghi GIF;
   - làm việc với nhiều tab.
4. **Chưa có trong tài liệu chính thức:**
   - chạy JavaScript trong trang. Đây chính là cách lấy `getComputedStyle` hay `document.getAnimations()`;
   - đọc network;
   - đổi cỡ cửa sổ hay giả lập giao diện sáng/tối.

   Muốn biết chắc, bạn gõ `/mcp`, chọn `claude-in-chrome`, rồi chọn **View tools**.
5. **Hạn chế:**
   - nó dùng profile Chrome thật của bạn, kèm mọi tài khoản đang đăng nhập;
   - nó chạy trong cửa sổ hiện thật, không chạy ngầm (headless) được, và không chạy trong CI;
   - tài liệu không nói subagent có dùng được hay không.

**Có hợp cho việc học UI/UX không?** Hợp cho lúc khám phá: bạn ngồi xem Claude thao tác trên trang như một người dùng.
Không hợp cho agent của kit. Kit cho `fe-dev` dùng `chrome-devtools` với profile tạm và cấm đăng nhập tài khoản thật,
trong khi Claude in Chrome đi qua chính profile thật của bạn.

## 3. Công cụ nào tốt nhất?

**Ba công cụ không thay nhau mà bổ trợ nhau.**

| Tiêu chí | Playwright (script) | `chrome-devtools` MCP | Claude in Chrome |
|---|---|---|---|
| Ai điều khiển | Script viết sẵn, lần nào chạy cũng y hệt | Agent gọi từng lệnh | Agent điều khiển Chrome thật của bạn |
| Đo hàng loạt (2 giao diện × 3 cỡ màn hình × 5 trang) | Tốt nhất | Được, nhưng mỗi ảnh một lần gọi tool | Chậm |
| Đọc CSS | `getComputedStyle`, đọc stylesheet, giao thức DevTools | `get_css_styles` (thấy cả rule CSS gốc), `evaluate_script` | Chưa có trong tài liệu |
| Animation | `getAnimations()`, dừng và tua animation, giả lập đồng hồ | `evaluate_script`, `screencast`, performance trace | Ghi GIF |
| So ảnh tự động | Có (`toHaveScreenshot`, so từng điểm ảnh) | Không | Không |
| Profile | Tạm thời, chạy ngầm | Tạm thời (theo cấu hình của kit) | Profile thật, có cửa sổ |
| Có sẵn trong `shop` | Có (`@playwright/test`) | Có, chỉ cho `fe-dev` | Chưa cài |

**Quy trình đề xuất, ba bước:**

1. **Khám phá** bằng `chrome-devtools` MCP, hoặc bằng Claude in Chrome khi bạn ngồi xem: trang có những màn hình,
   trạng thái và hiệu ứng nào, và dùng thư viện gì.
2. **Đo** bằng một script Playwright. Script chụp và lưu token của cả hai giao diện, ba cỡ màn hình, mọi trạng thái, rồi
   ghi ra JSON để chạy lại được.
3. **So** bằng Playwright: khi `fe-dev` làm xong, chụp app ở cùng cỡ màn hình, rồi so ảnh và token với trang mẫu. Đây là
   cách duy nhất biết được "giống tới đâu" bằng con số, không phải bằng mắt.

**Công cụ khác cũng hữu ích:**

- **Chrome DevTools, do bạn tự mở:**
  - panel **Animations** để làm chậm animation xuống 10% và xem keyframe, easing;
  - panel **CSS Overview** để liệt kê mọi màu, font, cỡ chữ và media query của trang, rất hợp để lập design system;
  - **Rendering** để giả lập sáng/tối và giảm chuyển động.
- **ffmpeg:** tách video thành ảnh từng khung hình.
- **Project Wallace, CSS Stats:** phân tích CSS của cả trang (bao nhiêu màu, font, cỡ chữ) để thấy design system thật.
- **html.to.design** (plugin Figma): đưa trang vào Figma để đo bằng mắt.

**Lưu ý bản quyền:** trang mẫu là template bán thương mại (có dải "BUY THIS TEMPLATE"). Học style như màu, khoảng cách
và kiểu bóng là cách ta đang làm. "Clone 100%" cả code, ảnh, icon, logo hay bố cục y hệt có thể vi phạm giấy phép.
Muốn giống hệt thì nên mua template và dùng theo giấy phép của nó.

## 4. Tool nào làm được hai việc bạn nêu?

### 4.1 Chụp nhiều khung hình

| Việc | Playwright | `chrome-devtools` MCP | Claude in Chrome |
|---|---|---|---|
| Cuộn từng bước nhỏ, chụp mỗi bước (parallax, hiệu ứng khi cuộn) | **Tốt nhất:** vòng lặp `mouse.wheel` + `screenshot`, chạy lại y hệt | Được: `evaluate_script` cuộn rồi `take_screenshot`, mỗi khung một lần gọi | Được, chậm hơn |
| Quay video animation rồi tách ảnh | `recordVideo` (webm), rồi `ffmpeg -i video.webm -vf fps=30 khung_%04d.png` | `screencast_start` / `screencast_stop` (`fe-dev` có hai tool này), rồi ffmpeg | Ghi GIF |

Hai mẹo để có khung hình chính xác:

1. **Cuộn bằng con lăn** (`mouse.wheel`), không dùng `scrollTo`. Thư viện cuộn mượt như Lenis chỉ nghe sự kiện con lăn.
   Chờ hai khung hình (`requestAnimationFrame`) rồi mới chụp.
2. **Dừng thời gian thay vì quay video:** video phụ thuộc tốc độ máy, còn dừng thời gian cho đúng mốc mili giây.
   - Animation CSS hay Web Animations: gọi `document.getAnimations()`, rồi `pause()` và đặt `currentTime` cho từng
     animation, chụp ở từng mốc.
   - GSAP: dừng timeline chung `gsap.globalTimeline`, rồi tua tới từng mốc bằng `time(t)`.
   - Animation viết tay bằng `requestAnimationFrame`: dùng đồng hồ giả của Playwright (`page.clock`).

### 4.2 Đọc cách animation được làm

Cả ba công cụ đều chạy được JavaScript trong trang: Playwright dùng `page.evaluate`, `chrome-devtools` dùng
`evaluate_script`. Với Claude in Chrome, việc này chưa có trong tài liệu. Những gì đọc được:

1. **`document.getAnimations()`** trả về animation CSS, transition CSS và Web Animations. Với mỗi animation,
   `effect.getKeyframes()` cho keyframe, còn `effect.getTiming()` cho thời lượng, easing, độ trễ và số lần lặp.
   - Transition chỉ xuất hiện **trong lúc đang chạy**, nên phải hover hay click trước rồi mới gọi.
2. **Stylesheet:** `@keyframes` đọc từ `document.styleSheets`. `transition-*` và `animation-*` của từng phần tử đọc
   bằng `getComputedStyle`. `get_css_styles` của `chrome-devtools` cho thấy rule gốc nằm ở đâu.
3. **Thư viện:**
   - **GSAP** đổi style bằng JavaScript, nên **không** hiện trong `getAnimations()`. Nhận ra nó qua `window.gsap` và
     `gsap.version`. `ScrollTrigger.getAll()` cho điểm bắt đầu, điểm kết thúc, `scrub` và `pin` của từng hiệu ứng cuộn.
   - **Lenis** thường gắn class `lenis` lên thẻ `html`.
   - **Framer Motion (Motion):** một phần chạy bằng Web Animations, nên thấy được trong `getAnimations()`; phần còn lại
     chạy bằng JavaScript.
   - Danh sách file script mà trang tải (tab network) cũng cho biết tên và phiên bản thư viện.
4. **Performance trace** của `chrome-devtools` cho thấy cái gì kích hoạt animation, và nó làm trình duyệt vẽ lại tới đâu.

Bạn nói đúng: đọc thông số theo cách này cho biết nhiều hơn xem video, vì ra được con số chính xác. Video và ảnh từng
khung vẫn cần, để so với app của mình ở bước 3 của quy trình.

## 5. Đề xuất cho Pilot 3

1. **Giao diện sáng của `SHOP-7`:** bạn chọn (a) hay (b) ở mục 1. Muốn (b) thì nhắn mình một câu, ví dụ "Dùng bảng màu
   sáng thật của trang mẫu", trước khi bấm Approve plan. Mình sẽ chạy `/ao-plan SHOP-7` kèm câu đó, để Task design
   system lấy số đo thật. `fe-dev` có `chrome-devtools`, nên tự bấm nút đổi giao diện và đo lại được.
2. **Cho kit, sau Pilot 3:** biến script đo trang mẫu thành một bước của kit. Bước đó chụp cả hai giao diện, ba cỡ màn
   hình, các trạng thái và animation, rồi ghi JSON. Khi `fe-dev` làm xong, một bước so ảnh tự động báo app giống trang
   mẫu tới đâu. Việc này nên vào `misc/thao-luan/concerns.md`.
