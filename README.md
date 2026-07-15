# FSEL Auto Register - Công cụ đăng ký tự động tài khoản FSEL cho Giáo viên

Hệ thống tự động đăng ký tài khoản hàng loạt trên trang FSEL (Tháng tự học tiếng Anh toàn quốc) dành cho Giáo viên, hỗ trợ tự sinh dữ liệu hoặc đăng ký theo danh sách email cụ thể.

---

## 🚀 Hướng dẫn Deploy miễn phí lên Render.com (Node Runtime - KHÔNG CẦN DOCKER)

Render.com cho phép liên kết trực tiếp với GitHub để tự động triển khai (deploy) dự án Node.js hoàn toàn miễn phí (Free Tier) mà không cần dùng Docker hay tài khoản trả phí.

### Các bước thực hiện:

1. Đăng ký tài khoản miễn phí tại [Render.com](https://render.com/) (Nên đăng nhập bằng tài khoản GitHub của thầy).
2. Tại màn hình Dashboard, nhấn nút **New +** ở góc phải -> Chọn **Web Service**.
3. Chọn tùy chọn **Build and deploy from a Git repository** -> Nhấn **Next**.
4. Liên kết và chọn kho chứa GitHub của thầy: `qualaduoc/auto-reg-fsel`.
5. Cấu hình các thông số Web Service như sau:
   - **Name**: `auto-reg-fsel` (hoặc tên tùy chọn).
   - **Region**: Chọn `Singapore` (để máy chủ gần Việt Nam nhất, tốc độ chạy sẽ nhanh nhất).
   - **Branch**: `main`
   - **Runtime**: Chọn **Node** (Tuyệt đối không chọn Docker).
    - **Build Command**: Nhập lệnh sau để cài đặt code và tải trình duyệt Chromium vào đúng thư mục node_modules (được Render tự động lưu trữ và cache):
      ```bash
      npm install && PLAYWRIGHT_BROWSERS_PATH=./node_modules/playwright-browsers npx playwright install chromium
      ```
   - **Start Command**: Nhập lệnh khởi chạy server:
     ```bash
     node server.js
     ```
   - **Instance Type**: Chọn **Free** (Miễn phí 100%, RAM 512MB, 0.1 CPU).
6. Nhấn **Create Web Service** ở dưới cùng.
7. Hệ thống Render sẽ tiến hành build và tự động tải trình duyệt Chromium về máy chủ của họ. Quá trình này mất khoảng 3-5 phút. Sau khi hoàn tất, Render sẽ cung cấp cho thầy một đường link dạng `https://auto-reg-fsel.onrender.com` để truy cập online.

---

### ⚠️ Một số lưu ý quan trọng khi chạy trên Render Free:

1. **Bộ nhớ RAM giới hạn (512MB)**:
   - Vì cấu hình miễn phí giới hạn RAM là 512MB, khi chạy tự động hóa trên Render, thầy **bắt buộc phải cấu hình Chế độ Browser là "Ẩn trình duyệt" (Headless)** trên giao diện web. Nếu để hiện trình duyệt, server sẽ bị quá tải RAM và sập ngay lập tức.
   - Tránh chạy số lượng tài khoản quá nhiều cùng một lúc (nên tạo từ 1 đến 5 tài khoản mỗi lượt chạy để tránh quá tải RAM của server Render).
2. **Chế độ tự động ngủ (Spin down)**:
   - Máy chủ Render gói Free sẽ tự động đi vào trạng thái "ngủ" nếu sau 15 phút không có bất kỳ ai truy cập.
   - Khi thầy hoặc giáo viên truy cập lại vào đường link, sẽ mất khoảng **50 giây** để máy chủ khởi động lại (đây là cơ chế tiết kiệm tài nguyên của Render, hoàn toàn bình thường).
