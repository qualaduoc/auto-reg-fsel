# Sử dụng image chính thức từ Microsoft đã cài đặt sẵn Playwright và các thư viện trình duyệt cần thiết
FROM mcr.microsoft.com/playwright:v1.45.0-jammy

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt các thư viện phụ thuộc của Node.js
RUN npm install

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Khai báo cổng chạy ứng dụng (ở đây là 3002)
EXPOSE 3002

# Thiết lập biến môi trường
ENV PORT=3002
# Bỏ qua việc tải lại browser vì image của Microsoft đã tích hợp sẵn
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Lệnh khởi chạy server
CMD ["node", "server.js"]
