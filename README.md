# FSEL Auto Register - Công cụ đăng ký tự động tài khoản FSEL cho Giáo viên

Hệ thống tự động đăng ký tài khoản hàng loạt trên trang FSEL (Tháng tự học tiếng Anh toàn quốc) dành cho Giáo viên, hỗ trợ tự sinh dữ liệu hoặc đăng ký theo danh sách email cụ thể.

---

## 🚀 Các nền tảng Deploy miễn phí (Free Deploy)

Để đưa công cụ này lên chạy Online miễn phí, bạn có thể lựa chọn 1 trong 2 nền tảng tốt nhất dưới đây:

### Cách 1: Deploy lên Hugging Face Spaces (Khuyên dùng - Siêu mạnh 16GB RAM)
Hugging Face cung cấp dịch vụ hosting Docker miễn phí với tài nguyên cực lớn (**2 CPU và 16GB RAM**), giúp trình duyệt Chrome ngầm chạy mượt mà không bao giờ bị tràn bộ nhớ (Out of Memory).

1. Đăng ký tài khoản miễn phí tại [Hugging Face](https://huggingface.co/).
2. Nhấn vào ảnh đại diện góc phải -> Chọn **New Space**.
3. Điền thông tin cấu hình Space:
   - **Space name**: `auto-reg-fsel` (hoặc tên tùy chọn).
   - **SDK**: Chọn **Docker** (Không chọn Streamlit/Gradio).
   - **Docker template**: Chọn **Blank** (Bỏ trống).
   - **Space hardware**: Chọn **CPU basic • 2 vCPUs • 16 GB RAM • Free** (Mặc định).
   - **Visibility**: Chọn **Public** hoặc **Private** (Nên chọn Private nếu muốn giữ riêng tư giao diện web).
4. Nhấn **Create Space**.
5. Chuyển sang tab **Settings** của Space vừa tạo -> Cuộn xuống phần **Variables and secrets** -> Nhấn **New secret**:
   - Name: `PORT`
   - Value: `7860` (Hugging Face bắt buộc ứng dụng chạy ở cổng `7860`).
6. Liên kết với GitHub:
   - Thầy có thể đẩy trực tiếp code lên Space thông qua Git của Hugging Face, hoặc cấu hình đồng bộ (sync) trực tiếp từ kho chứa GitHub `https://github.com/qualaduoc/auto-reg-fsel` vào Space.
7. Đợi hệ thống build Docker khoảng 3-5 phút, sau đó trang web sẽ sẵn sàng chạy online vĩnh viễn!

---

### Cách 2: Deploy lên Render.com (Dễ nhất - Chỉ cần click chuột)
Render cho phép liên kết trực tiếp với GitHub để tự động deploy dự án Node.js miễn phí.

1. Đăng ký tài khoản miễn phí tại [Render.com](https://render.com/) bằng tài khoản GitHub của thầy.
2. Tại màn hình Dashboard, nhấn **New +** -> Chọn **Web Service**.
3. Chọn **Build and deploy from a Git repository** -> Nhấn **Next**.
4. Liên kết và chọn kho chứa GitHub: `qualaduoc/auto-reg-fsel`.
5. Cấu hình Web Service:
   - **Name**: `auto-reg-fsel`
   - **Region**: Chọn khu vực gần Việt Nam nhất (ví dụ: `Singapore`).
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Chọn **Free** (512MB RAM, 0.1 CPU).
6. Nhấn vào phần **Advanced** -> Chọn **Add Environment Variable**:
   - Key: `PORT`
   - Value: `3002` (hoặc bất kỳ cổng nào).
7. Nhấn **Create Web Service**.
8. Đợi hệ thống tự động tải trình duyệt Chromium và deploy dự án (mất khoảng 3-5 phút).

*Lưu ý khi dùng Render Free*:
- Do tài nguyên giới hạn (512MB RAM), nếu chạy nhiều luồng Chrome cùng lúc có thể bị chậm hoặc crash. Hãy luôn giữ số lượng luồng nhỏ.
- Ứng dụng sẽ tự động "ngủ" sau 15 phút không có người truy cập để tiết kiệm tài nguyên. Lượt truy cập tiếp theo sẽ mất khoảng 50 giây để khởi động lại.
