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

    // 4. XỬ LÝ ONBOARDING POP-UP VÀ SETUP LỘ TRÌNH (Nếu có)
    console.log('4. Kiểm tra và vượt qua chuỗi Onboarding pop-up...');
    const onboardingBtn = page.locator('text="Nhấn để tiếp tục"');
    let onboardingStep = 1;
    
    // Vòng lặp click qua tất cả các bước slide chào mừng (tối đa 5 slide)
    while (await onboardingBtn.isVisible() && onboardingStep <= 5) {
      console.log(`-> Phát hiện Onboarding slide bước ${onboardingStep}. Click "Nhấn để tiếp tục"...`);
      await onboardingBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outputDir, `02_onboarding_step_${onboardingStep}.png`) });
      onboardingStep++;
    }

    // Đợi 2 giây sau khi kết thúc chuỗi onboarding để chuyển sang màn hình tiếp theo
    await page.waitForTimeout(2000);

    // Kiểm tra nút "Tiếp tục" ở màn hình kết quả Test / Setup lộ trình (như ảnh thầy gửi)
    const continueBtn = page.locator('text="Tiếp tục"').first();
    if (await continueBtn.isVisible()) {
      console.log('-> Phát hiện màn hình Setup lộ trình (kết quả test Pre A1). Đang click "Tiếp tục"...');
      await continueBtn.click({ force: true });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(outputDir, '02_2_after_continue_1.png') });

      // Click tiếp tục bước 2 (Lựa chọn khóa học)
      const continueBtn2 = page.locator('text="Tiếp tục"').first();
      if (await continueBtn2.isVisible()) {
        console.log('-> Đang click "Tiếp tục" bước 2 (Lựa chọn khóa học)...');
        await continueBtn2.click({ force: true });
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(outputDir, '02_3_after_continue_2.png') });

        // Click tiếp tục bước 3 (Xây dựng lộ trình)
        const continueBtn3 = page.locator('text="Tiếp tục"').first();
        if (await continueBtn3.isVisible()) {
          console.log('-> Đang click "Tiếp tục" bước 3 (Xây dựng lộ trình)...');
          await continueBtn3.click({ force: true });
          await page.waitForTimeout(3000);
          await page.screenshot({ path: path.join(outputDir, '02_4_path_setup_completed.png') });
        }
      }
    }

    // 5. KIỂM TRA LẠI BÀI TEST ĐẦU VÀO
    console.log('5. Kiểm tra lại xem có yêu cầu làm bài test đầu vào không...');
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

    // 6. TIẾN HÀNH CÀO DỮ LIỆU BÀI HỌC (Nếu đã hoàn thành bài test)
    console.log('6. Tài khoản đã được kích hoạt lộ trình! Bắt đầu cào dữ liệu...');
    
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
