const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, 'node_modules', 'playwright-browsers');

const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Lưu trữ danh sách kết nối SSE để gửi log real-time
let clients = [];
const csvPath = path.join(__dirname, 'danh_sach_tai_khoan.csv');

// Hàm gửi log tới tất cả client đang kết nối
function broadcastLog(type, message, data = null) {
  const logObj = {
    timestamp: new Date().toLocaleTimeString(),
    type, // 'info', 'success', 'warning', 'error', 'progress'
    message,
    data
  };
  
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(logObj)}\n\n`);
  });
}

// Khởi tạo file CSV nếu chưa tồn tại
function initCSVFile() {
  if (!fs.existsSync(csvPath)) {
    // Thêm BOM UTF-8 (\ufeff) để Excel hiển thị đúng font tiếng Việt
    const header = '\ufeffEmail/Tên đăng nhập,Mật khẩu,Họ tên,Ngày sinh,Số điện thoại,Tỉnh/Thành phố,Cấp học,Trường học,Thời gian tạo\n';
    fs.writeFileSync(csvPath, header, 'utf8');
    console.log('Đã tạo file CSV lưu trữ kết quả.');
  }
}
initCSVFile();

// API stream logs (Server-Sent Events)
app.get('/api/logs-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Gửi log chào mừng khi kết nối thành công
  res.write(`data: ${JSON.stringify({ timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'Kết nối hệ thống log thành công.' })}\n\n`);

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Hàm sinh Họ tên tiếng Việt ngẫu nhiên
function generateVietnameseName() {
  const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
  const middleNames = ['Văn', 'Thị', 'Minh', 'Hồng', 'Ngọc', 'Đức', 'Xuân', 'Kim', 'Bảo', 'Hoài', 'Thanh', 'Tuấn', 'Quang', 'Khánh'];
  const names = ['Anh', 'Bình', 'Chi', 'Dũng', 'Đông', 'Giang', 'Hương', 'Hùng', 'Hà', 'Khoa', 'Linh', 'Mai', 'Nam', 'Phong', 'Quỳnh', 'Sơn', 'Trang', 'Tuấn', 'Vy', 'Yến'];
  
  const family = familyNames[Math.floor(Math.random() * familyNames.length)];
  const middle = middleNames[Math.floor(Math.random() * middleNames.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  
  return `${family} ${middle} ${name}`;
}

// Hàm sinh số điện thoại ngẫu nhiên Việt Nam
function generatePhoneNumber() {
  const prefixes = ['090', '091', '092', '093', '094', '096', '097', '098', '099', '086', '088', '089', '032', '033', '034', '035', '036', '037', '038', '039', '070', '076', '077', '078', '079', '056', '058'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
  return prefix + suffix;
}

// Hàm sinh email ngẫu nhiên
function generateRandomEmail(grade) {
  const grades = ['mamnon', 'tieuhoc', 'thcs', 'thpt'];
  const selectedGrade = grade && grades.includes(grade) ? grade : grades[Math.floor(Math.random() * grades.length)];
  const year = Math.floor(1970 + Math.random() * (2026 - 1970 + 1));
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString(); // Tránh trùng lặp email
  return `Giaovien${selectedGrade}${year}${randomStr}@gmail.com`;
}

// Hàm sinh ngày sinh ngẫu nhiên
function generateBirthDate() {
  const year = Math.floor(1975 + Math.random() * (2002 - 1975 + 1));
  const month = Math.floor(1 + Math.random() * 12).toString().padStart(2, '0');
  const day = Math.floor(1 + Math.random() * 28).toString().padStart(2, '0');
  return `${day}/${month}/${year}`;
}

// Biến lưu trạng thái đang chạy để tránh chạy song song nhiều tiến trình
let isRunning = false;

// API bắt đầu đăng ký
app.post('/api/start-register', async (req, res) => {
  if (isRunning) {
    return res.status(400).json({ success: false, error: 'Hệ thống đang thực hiện một tiến trình đăng ký khác. Vui lòng đợi!' });
  }

  const { quantity = 1, customEmail = '', grade = 'random', province = 'Hà Nội', headless = true } = req.body;
  
  isRunning = true;
  res.json({ success: true, message: `Bắt đầu tiến trình tạo ${quantity} tài khoản.` });

  // Chạy tiến trình trong background
  (async () => {
    broadcastLog('info', `[AETHER-INIT] Initializing register pipeline: quantity = ${quantity}`);
    let successCount = 0;

    for (let i = 1; i <= quantity; i++) {
      broadcastLog('progress', `[AETHER-PROGRESS] Session ${i}/${quantity} - Synthesizing data cells...`);
      
      const fullName = generateVietnameseName();
      const birthDate = generateBirthDate();
      const email = (i === 1 && customEmail) ? customEmail : generateRandomEmail(grade === 'random' ? null : grade);
      const phone = generatePhoneNumber();
      const gender = Math.random() > 0.5 ? 'Nam' : 'Nữ';

      broadcastLog('info', `[DNA-VECTOR] Synthesizing variables: Target: ${email} | Sector: ${province}`);

      let browser;
      try {
        broadcastLog('info', `[NUCLEUS-CHROME] Initializing sandboxed chrome core (headless=${headless})`);
        browser = await chromium.launch({ headless });
        const context = await browser.newContext({
          viewport: { width: 1280, height: 1000 }
        });
        const page = await context.newPage();

        broadcastLog('info', `[SYNAPSE-LINK] Handshaking target gateway fsel.vn...`);
        await page.goto('https://thangtuhoctoanquoc.fsel.vn/', { waitUntil: 'networkidle', timeout: 30000 });

        broadcastLog('info', `[IGNITION-0] Accessing primary registration dialog overlay.`);
        await page.click('text="Đăng ký ngay"');
        await page.waitForTimeout(1500);

        const dialog = page.locator('[role="dialog"]');
        const isDialogVisible = await dialog.isVisible();
        if (!isDialogVisible) {
          throw new Error('Không hiển thị được modal điền thông tin đăng ký.');
        }

        // Điền form đăng ký
        await dialog.locator('#FirstName').fill(fullName);
        await dialog.locator('input[placeholder="dd/mm/yyyy"]').fill(birthDate);
        await dialog.locator('#Email').fill(email);
        await dialog.locator('#PhoneNumber').fill(phone);
        await dialog.locator(`text="${gender}"`).first().click();

        // Tỉnh/Thành phố
        broadcastLog('info', `[NEXUS-GRID] Binding geographic coordinates: ${province}`);
        await dialog.locator('button:has-text("Tỉnh/Thành phố")').first().click({ force: true });
        await page.waitForTimeout(1000);
        
        const provinceOption = page.locator(`button[class*="hover:bg-gray-100"]:has-text("${province}")`).first();
        const hasProvince = await provinceOption.isVisible();
        if (!hasProvince) {
          throw new Error(`Không tìm thấy Tỉnh/Thành phố: ${province} trên hệ thống FSEL.`);
        }
        await provinceOption.click({ force: true });
        await page.waitForTimeout(1000);

        // Cấp học
        let selectedGradeText = '';
        if (grade === 'random') {
          broadcastLog('info', `[NEXUS-GRID] Selecting random sub-tier level...`);
          await dialog.locator('button:has-text("Chọn cấp học")').first().click({ force: true });
          await page.waitForTimeout(1000);
          const gradeOptions = await page.locator('button[class*="hover:bg-gray-100"]').all();
          const randomGradeIdx = Math.floor(Math.random() * gradeOptions.length);
          selectedGradeText = await gradeOptions[randomGradeIdx].innerText();
          await gradeOptions[randomGradeIdx].click({ force: true });
        } else {
          // Ánh xạ grade sang tiếng Việt để chọn dropdown
          const gradeMap = {
            'mamnon': 'Mầm non',
            'tieuhoc': 'Tiểu học',
            'thcs': 'Trung học cơ sở',
            'thpt': 'Trung học phổ thông'
          };
          const targetGradeText = gradeMap[grade];
          broadcastLog('info', `[NEXUS-GRID] Selecting sub-tier level: ${targetGradeText}`);
          await dialog.locator('button:has-text("Chọn cấp học")').first().click({ force: true });
          await page.waitForTimeout(1000);
          const gradeOption = page.locator(`button[class*="hover:bg-gray-100"]:has-text("${targetGradeText}")`).first();
          selectedGradeText = targetGradeText;
          await gradeOption.click({ force: true });
        }
        await page.waitForTimeout(1000);

        // Phường/Xã/Quận/Huyện
        broadcastLog('info', `[NEXUS-GRID] Mapping local sub-grids...`);
        await dialog.locator('button:has-text("Phường/Xã/Đặc khu")').first().click({ force: true });
        await page.waitForTimeout(1500);
        
        let wardOptions = await page.locator('button[class*="hover:bg-gray-100"]').all();
        let selectedWardText = 'Không chọn';
        if (wardOptions.length > 0) {
          const randomWardIdx = Math.floor(Math.random() * wardOptions.length);
          selectedWardText = await wardOptions[randomWardIdx].innerText();
          await wardOptions[randomWardIdx].click({ force: true });
          broadcastLog('info', `[NEXUS-GRID] Connected to sub-grid node: ${selectedWardText}`);
        } else {
          // Bấm đóng dropdown phường xã nếu không có dữ liệu
          await page.keyboard.press('Escape');
          broadcastLog('warning', `[FLUCTUATION] Null sub-grid return. Skipping node.`);
        }
        await page.waitForTimeout(1000);

        // Trường học
        broadcastLog('info', `[INSTITUTE-CELL] Resolving education entity lists...`);
        await dialog.locator('button:has-text("Trường học")').first().click({ force: true });
        await page.waitForTimeout(1500);

        let schoolOptions = await page.locator('button[class*="hover:bg-gray-100"]').all();
        let selectedSchoolText = '';
        if (schoolOptions.length > 0) {
          const randomSchoolIdx = Math.floor(Math.random() * schoolOptions.length);
          selectedSchoolText = await schoolOptions[randomSchoolIdx].innerText();
          await schoolOptions[randomSchoolIdx].click({ force: true });
          broadcastLog('info', `[INSTITUTE-CELL] Target entity mapped: ${selectedSchoolText}`);
        } else {
          // Xử lý tự động chọn lại Phường/Xã khác nếu không có trường nào
          broadcastLog('warning', `[FLUCTUATION] Entity mismatch. Retrying fallback routing...`);
          await page.keyboard.press('Escape'); // Đóng dropdown trường học
          await page.waitForTimeout(500);
          
          await dialog.locator('button:has-text("Phường/Xã/Đặc khu")').first().click({ force: true });
          await page.waitForTimeout(1000);
          wardOptions = await page.locator('button[class*="hover:bg-gray-100"]').all();
          if (wardOptions.length > 0) {
            await wardOptions[0].click({ force: true });
            await page.waitForTimeout(1000);
            
            await dialog.locator('button:has-text("Trường học")').first().click({ force: true });
            await page.waitForTimeout(1500);
            schoolOptions = await page.locator('button[class*="hover:bg-gray-100"]').all();
            if (schoolOptions.length > 0) {
              selectedSchoolText = await schoolOptions[0].innerText();
              await schoolOptions[0].click({ force: true });
              broadcastLog('info', `[INSTITUTE-CELL] Fallback target entity mapped: ${selectedSchoolText}`);
            }
          }
        }
        await page.waitForTimeout(1000);

        if (!selectedSchoolText) {
          throw new Error('Không thể lựa chọn Trường học phù hợp. Vui lòng kiểm tra lại Cấp học hoặc Tỉnh/Thành phố.');
        }

        // Chức vụ: Giáo viên
        broadcastLog('info', `[INJECTION-FLUX] Injecting profile attributes: ROLE_TEACHER`);
        await dialog.locator('button:has-text("Chọn chức vụ")').first().click({ force: true });
        await page.waitForTimeout(1000);
        await page.locator('button[class*="hover:bg-gray-100"]:has-text("Giáo viên")').first().click({ force: true });
        await page.waitForTimeout(1000);

        // Bộ môn: Tiếng Anh (hoặc đầu tiên)
        broadcastLog('info', `[INJECTION-FLUX] Injecting discipline vector: SUBJECT_ENGLISH`);
        await dialog.locator('button:has-text("Chọn Bộ môn")').first().click({ force: true });
        await page.waitForTimeout(1000);
        let englishSubject = page.locator('button[class*="hover:bg-gray-100"]:has-text("Tiếng Anh")').first();
        const hasEnglish = await englishSubject.isVisible();
        if (hasEnglish) {
          await englishSubject.click({ force: true });
        } else {
          const subjectOptions = await page.locator('button[class*="hover:bg-gray-100"]').all();
          if (subjectOptions.length > 0) {
            await subjectOptions[0].click({ force: true });
          }
        }
        await page.waitForTimeout(1000);

        // Giáo viên chủ nhiệm: Có
        await dialog.locator('text="Có"').first().click();
        await page.waitForTimeout(1000);

        // Bấm ĐĂNG KÍ NGAY
        broadcastLog('info', `[IGNITION-1] Launching primary registration packet...`);
        await dialog.locator('button:has-text("ĐĂNG KÍ NGAY")').first().click({ force: true });
        await page.waitForTimeout(1500);

        // Xử lý hộp thoại cam kết/chú ý
        broadcastLog('info', `[COVENANT-BIND] Bypassing warning dialog: check=true | IGNITION-2=commit`);
        await page.locator('[role="dialog"]').last().locator('input[type="checkbox"]').check({ force: true });
        await page.waitForTimeout(500);
        await page.locator('[role="dialog"]').last().locator('button:has-text("Đăng ký ngay")').click({ force: true });

        // Chờ kết quả
        broadcastLog('info', `[ORBITAL-PULSE] Waiting for remote host callback handshake...`);
        const successModalHeader = page.locator('text="Đăng ký thành công!"');
        await successModalHeader.waitFor({ state: 'visible', timeout: 25000 });

        // Trích xuất thông tin
        const successText = await page.locator('[role="dialog"]').last().innerText();
        const usernameMatch = successText.match(/Tên đăng nhập:\s*([^\n]+)/);
        const passwordMatch = successText.match(/Mật khẩu:\s*([^\n]+)/);
        
        const username = usernameMatch ? usernameMatch[1].trim() : email;
        const password = passwordMatch ? passwordMatch[1].trim() : 'Tuhoc@2026';

        // Ghi vào file CSV
        const timestamp = new Date().toLocaleString('vi-VN');
        const csvLine = `"${username}","${password}","${fullName}","${birthDate}","${phone}","${province}","${selectedGradeText}","${selectedSchoolText}","${timestamp}"\n`;
        fs.appendFileSync(csvPath, csvLine, 'utf8');

        successCount++;
        broadcastLog('success', `[Thành công] Đăng ký thành công tài khoản: ${username} | Mật khẩu: ${password}`);
        
        // Gửi thông tin tài khoản vừa tạo về Frontend để hiển thị
        broadcastLog('account_created', `Tạo tài khoản thành công!`, {
          email: username,
          password: password,
          fullName,
          school: selectedSchoolText,
          timestamp
        });

      } catch (error) {
        console.error('Lỗi chi tiết:', error);
        broadcastLog('error', `[RUPTURE] Session ${i} failed: ${error.message}`);
      } finally {
        if (browser) {
          await browser.close();
        }
      }
      
      // Delay nhẹ 2s giữa các lần tạo tài khoản để an toàn
      if (i < quantity) {
        broadcastLog('info', `[AETHER] Throttling 2000ms delay for next session...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    broadcastLog('success', `=== HOÀN TẤT TIẾN TRÌNH: Đã tạo thành công ${successCount}/${quantity} tài khoản ===`);
    isRunning = false;
  })();
});

// API tải file CSV kết quả
app.get('/api/download-csv', (req, res) => {
  if (fs.existsSync(csvPath)) {
    res.download(csvPath, 'danh_sach_tai_khoan.csv');
  } else {
    res.status(404).json({ success: false, message: 'Chưa có file tài khoản nào được tạo.' });
  }
});

// API đọc lịch sử tài khoản đã tạo để hiển thị lên UI
app.get('/api/accounts-history', (req, res) => {
  if (!fs.existsSync(csvPath)) {
    return res.json([]);
  }
  
  try {
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    // Bỏ Byte Order Mark (BOM) nếu có
    const cleanContent = fileContent.startsWith('\ufeff') ? fileContent.slice(1) : fileContent;
    const lines = cleanContent.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length <= 1) return res.json([]); // Chỉ có header

    const accounts = [];
    // Phân tích CSV đơn giản (bỏ qua header)
    for (let i = 1; i < lines.length; i++) {
      // Regex tách các trường trong nháy kép
      const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const fields = matches.map(f => f.replace(/^"|"$/g, ''));
      
      if (fields.length >= 2) {
        accounts.push({
          email: fields[0],
          password: fields[1],
          fullName: fields[2] || '',
          phone: fields[4] || '',
          province: fields[5] || '',
          school: fields[7] || '',
          timestamp: fields[8] || ''
        });
      }
    }
    // Trả về danh sách đảo ngược (mới nhất lên đầu)
    res.json(accounts.reverse());
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
