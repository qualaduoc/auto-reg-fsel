const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function crawlCourseContent() {
  console.log('=== KHỞI CHẠY HỆ THỐNG CÀO GIÁO TRÌNH FSEL ===');
  console.log('Khởi chạy trình duyệt ảo...');
  const browser = await chromium.launch({ headless: true }); // Chạy ẩn
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 }
  });
  const page = await context.newPage();

  const outputDir = path.join(__dirname, 'tai_lieu_fsel');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    console.log('1. Truy cập trang đăng nhập LMS FSEL...');
    await page.goto('https://lms.fsel.edu.vn/', { waitUntil: 'networkidle', timeout: 45000 });

    console.log('2. Đang điền thông tin tài khoản...');
    await page.locator('input[name="UserName"]').fill('Giaovienthpt20244900@gmail.com');
    await page.locator('input[name="Password"]').fill('Tuhoc@2026');
    await page.screenshot({ path: path.join(outputDir, '01_login_filled.png') });

    console.log('3. Đang thực hiện đăng nhập...');
    const loginButton = page.locator('button:has-text("Đăng nhập"), button:has-text("LOG IN"), input[type="submit"]');
    if (await loginButton.first().isVisible()) {
      await loginButton.first().click();
    } else {
      await page.locator('input[name="Password"]').press('Enter');
    }

    // Đợi chuyển hướng vào trang chủ học tập
    console.log('Đang chờ phản hồi từ máy chủ và chuyển hướng...');
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.screenshot({ path: path.join(outputDir, '02_home_dashboard.png') });

    console.log('URL hiện tại:', page.url());
    if (!page.url().includes('home') && !page.url().includes('dashboard')) {
      console.log('Nội dung trang hiện tại:\n', await page.innerText('body'));
      throw new Error('Đăng nhập thất bại hoặc bị chặn bởi hệ thống bảo mật.');
    }

    // 4. KIỂM TRA BÀI TEST ĐẦU VÀO
    console.log('4. Kiểm tra trạng thái bài test năng lực đầu vào...');
    const hasTestPrompt = await page.locator('text="Bài kiểm tra năng lực miễn phí"').isVisible();
    const hasStartBtn = await page.locator('button:has-text("Bắt đầu ngay")').first().isVisible();

    if (hasTestPrompt || hasStartBtn) {
      console.log('\n[CẢNH BÁO] Tài khoản này CHƯA hoàn thành bài kiểm tra năng lực đầu vào!');
      console.log('-> Vui lòng làm theo hướng dẫn sau để mở khóa lộ trình cào dữ liệu:');
      console.log('   1. Đăng nhập thủ công trên trình duyệt web của thầy bằng tài khoản:');
      console.log('      - Email: Giaovienthpt20244900@gmail.com');
      console.log('      - Mật khẩu: Tuhoc@2026');
      console.log('   2. Bấm "Bắt đầu ngay" và hoàn thành bài test năng lực đầu vào (khoảng 30 phút).');
      console.log('   3. Sau khi hoàn tất và hệ thống mở khóa các bài học tiếng Anh chính thức, thầy hãy chạy lại script này.');
      
      // Chụp ảnh làm minh chứng
      await page.screenshot({ path: path.join(outputDir, 'test_needed_screenshot.png') });
      console.log(`Đã chụp ảnh minh chứng trạng thái yêu cầu làm test tại: ${path.join(outputDir, 'test_needed_screenshot.png')}`);
      return;
    }

    // 5. TIẾN HÀNH CÀO DỮ LIỆU BÀI HỌC (Nếu đã hoàn thành bài test)
    console.log('Tài khoản đã được kích hoạt lộ trình! Bắt đầu cào dữ liệu...');
    
    // Thử truy cập vào menu học tập (ví dụ chuyển hướng trực tiếp đến trang học tập của FSEL)
    // Các endpoint phổ biến của LMS: /learning, /courses, /my-courses, /class
    const learningUrl = 'https://lms.fsel.edu.vn/learning';
    console.log(`Đi tới trang học tập: ${learningUrl}...`);
    await page.goto(learningUrl, { waitUntil: 'networkidle' }).catch(() => {});
    await page.screenshot({ path: path.join(outputDir, '03_learning_page.png') });

    // Cào thông tin tổng quan các bài học hiển thị trên màn hình
    const learningContent = await page.evaluate(() => {
      // Tìm các khóa học hoặc bài học
      const lessonCards = Array.from(document.querySelectorAll('a, div.card, div.lesson-item, .course-item'));
      return lessonCards.map(card => ({
        text: card.innerText.trim(),
        href: card.getAttribute ? card.getAttribute('href') : null
      })).filter(item => item.text.length > 10);
    });

    console.log('Các bài học/chương trình học phát hiện được:', learningContent);

    // Ghi dữ liệu thô vào file markdown tạm thời để thầy xem
    const docPath = path.join(outputDir, 'giao_trinh_fsel_raw.md');
    let mdContent = `# Dữ liệu cào giáo trình FSEL\n\nNgày quét: ${new Date().toLocaleString('vi-VN')}\n\n`;
    mdContent += `### Danh sách bài học phát hiện:\n\n`;
    learningContent.forEach((item, index) => {
      mdContent += `${index + 1}. **Nội dung**: ${item.text.replace(/\n/g, ' - ')}\n`;
      if (item.href) mdContent += `   - **Đường dẫn**: ${item.href}\n`;
      mdContent += `\n`;
    });

    fs.writeFileSync(docPath, mdContent, 'utf8');
    console.log(`Đã xuất báo cáo sơ bộ ra file: ${docPath}`);

  } catch (error) {
    console.error('Lỗi trong quá trình cào giáo trình:', error);
  } finally {
    await browser.close();
    console.log('Đã đóng trình duyệt.');
  }
}

crawlCourseContent();
