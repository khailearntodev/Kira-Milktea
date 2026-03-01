# 🧋 Kira-Milktea - Telegram Ordering Bot

**Kira-Milktea** là một hệ thống đặt món đồ uống tự động trên nền tảng Telegram, được thiết kế để phục vụ các quán trà sữa vừa và nhỏ. Bot cung cấp trải nghiệm đặt hàng mượt mà từ việc xem menu, chọn size, quản lý giỏ hàng đến chốt đơn, đồng thời cung cấp công cụ quản lý tình trạng món (Hết hàng/Còn hàng) cho chủ quán theo thời gian thực.

![Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Telegram-blue)
![Language](https://img.shields.io/badge/Language-TypeScript-3178C6)
![Deployment](https://img.shields.io/badge/Deployment-Render-brightgreen)

## 🤖 Trải Nghiệm Ngay

Hệ thống đã được deploy và hoạt động ổn định trên **Render**. Bạn có thể trải nghiệm ngay tại:

👉 **Bot Username:** `@kira_milktea_bot`  
🔗 **Link:** [t.me/kira_milktea_bot](https://t.me/kira_milktea_bot)

---

## 🚀 Giới Thiệu Đề Tài

Trong bối cảnh chuyển đổi số, việc tối ưu hóa quy trình nhận đơn qua các kênh chat là rất cần thiết. **Kira-Milktea** giải quyết bài toán này bằng cách tự động hóa quy trình gọi món, giúp:
- **Khách hàng**: Dễ dàng xem menu, chọn món và biết chính xác tổng tiền mà không cần chờ nhân viên tư vấn.
- **Chủ quán**: Giảm tải việc trả lời tin nhắn thủ công, quản lý đơn hàng tập trung và cập nhật tình trạng món ngay lập tức.

---

## 🛠️ Công Nghệ Sử Dụng

Dự án được xây dựng dựa trên các công nghệ hiện đại, đảm bảo tính ổn định và dễ dàng mở rộng:

| Thành phần | Công nghệ | Mô tả |
| :--- | :--- | :--- |
| **Ngôn ngữ** | **TypeScript (Node.js)** | Đảm bảo tính chặt chẽ về dữ liệu (Type Safety) và dễ bảo trì. |
| **Framework** | **Telegraf.js** | Framework mạnh mẽ để xây dựng Bot Telegram. |
| **Dữ liệu tĩnh** | **CSV** | Lưu trữ danh mục món ăn, giá cả và thông tin cơ bản (dễ dàng chỉnh sửa Excel). |
| **Database/Cache** | **Redis (Upstash)** | Quản lý Session (Giỏ hàng của khách) và trạng thái **Hết hàng/Còn hàng** theo thời gian thực. |
| **Triển khai** | **Docker & Render** | Đóng gói ứng dụng và triển khai tự động trên cloud. |

---

## 📂 Cấu Trúc Dự Án (Package Structure)

Dự án được tổ chức theo kiến trúc module, tách biệt rõ ràng giữa logic xử lý và dữ liệu:

```
Kira-Milktea/
├── src/
│   ├── bot.ts              # Entry point: Khởi tạo Bot, đăng ký các commands và actions
│   ├── config/             # Cấu hình môi trường (Environment variables)
│   ├── data/               # Chứa file Menu.csv (Dữ liệu món ăn gốc)
│   ├── handlers/           # Xử lý các tương tác từ người dùng
│   │   ├── actionHandler.ts   # Xử lý nút bấm (Callback Query): Chọn món, sửa cart,...
│   │   ├── commandHandler.ts  # Xử lý lệnh (Command): /start, /menu, /hethang,...
│   │   └── messageHandler.ts  # Xử lý tin nhắn văn bản (Nhập số lượng)
│   ├── services/           # Business Logic (Logic nghiệp vụ)
│   │   ├── cartService.ts     # Quản lý giỏ hàng (Redis)
│   │   ├── menuService.ts     # Đọc CSV và merge trạng thái từ Redis
│   │   └── orderService.ts    # Tính toán hóa đơn, format tin nhắn chốt đơn
│   ├── types/              # Định nghĩa các Interface/Type (TypeScript)
│   └── utils/              # Các hàm tiện ích
│       └── redis.ts           # Wrapper cho Redis Client
├── docker-compose.yml      # Cấu hình Docker
├── Dockerfile              # File build image
└── package.json            # Khai báo dependencies
```

---

## 💡 Chức Năng & Use Cases - Hướng Dẫn Sử Dụng

### 1. Dành Cho Khách Hàng (User)

**Lệnh cơ bản:**
- `/start` - Khởi động bot, hiển thị lời chào.
- `/menu` - Xem danh sách đồ uống (ẩn danh mục nếu đã hết).
- `/clear` - Xóa nhanh giỏ hàng và session hiện tại.
- `/help` - Xem hướng dẫn sử dụng.

**Thao tác đặt hàng:**
1.  **Xem Menu:** Chọn danh mục (Trà sữa, Trà trái cây...).
2.  **Chọn Món:** Bấm vào món muốn đặt -> Chọn Size (M hoặc L).
3.  **Nhập Số Lượng:** Chat một con số bất kỳ (ví dụ: `2`, `5`...) để thêm vào giỏ.
4.  **Xem Giỏ Hàng:** Bấm nút "Giỏ hàng" để kiểm tra, sửa số lượng hoặc xóa món.
5.  **Chốt Đơn:** Xác nhận đơn hàng.

**Lưu ý:**
- Khách chỉ có thể đặt hàng trong khung giờ mở cửa (Cấu hình trong `.env`, mặc định 7h - 22h theo giờ **Việt Nam UTC+7**).
- Giá tiền tự động tính theo Size.

### 2. Dành Cho Chủ Quán (Admin)

Chủ quán (được xác định qua `OWNER_ID`) có thể quản lý nhanh tình trạng món ăn.

| Chức năng | Lệnh | Ví dụ | Tác dụng |
| :--- | :--- | :--- | :--- |
| **Báo Hết Hàng** | `/hethang <MãMón>` | `/hethang TS01` | Đánh dấu món là hết. Món sẽ ẩn khỏi Menu và không thể đặt. |
| **Báo Còn Hàng** | `/conhang <MãMón>` | `/conhang TS01` | Mở lại món để khách đặt hàng bình thường. |

*(Mã món được quy định trong file dữ liệu gốc `src/data/Menu.csv`)*

---

## ⚙️ Cài Đặt & Chạy Dự Án

### Yêu cầu
- Node.js >= 18
- Redis (Local hoặc Cloud URL)
- Telegram Bot Token (từ @BotFather)

### Các bước chạy Local
1. Clone repo:
   ```bash
   git clone https://github.com/khailearntodev/Kira-Milktea.git
   cd Kira-Milktea
   ```

2. Tạo file `.env`:
   ```env
   BOT_TOKEN=your_telegram_bot_token
   REDIS_URL=redis://localhost:6379 or your_upstash_url
   OWNER_ID=your_telegram_user_id
   OPEN_HOUR=07:00
   CLOSE_HOUR=22:00
   NODE_ENV=development
   ```

3. Cài đặt và chạy:
   ```bash
   npm install
   npm run dev
   ```

### Chạy với Docker
```bash
docker-compose up --build
```
