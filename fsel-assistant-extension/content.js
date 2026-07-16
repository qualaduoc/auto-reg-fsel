// Content Script chạy trực tiếp trên trang lms.fsel.edu.vn
let config = { geminiKey: '', autoSolve: false };
let isSolving = false;

// 1. Tạo widget điều khiển hiển thị ở góc màn hình
function createWidget() {
  if (document.getElementById('fsel-helper-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'fsel-helper-widget';
  widget.style.position = 'fixed';
  widget.style.bottom = '20px';
  widget.style.right = '20px';
  widget.style.zIndex = '999999';
  widget.style.backgroundColor = '#1e293b';
  widget.style.color = '#f8fafc';
  widget.style.border = '1px solid #334155';
  widget.style.borderRadius = '12px';
  widget.style.padding = '12px 16px';
  widget.style.width = '260px';
  widget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3)';
  widget.style.fontFamily = 'sans-serif';
  widget.style.fontSize = '13px';

  widget.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 6px;">
      <span style="font-weight: bold; color: #3b82f6;">🤖 FSEL AI Assistant</span>
      <span id="widget-status" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background-color: #64748b; color: white;">Tắt</span>
    </div>
    <div id="widget-logs" style="max-height: 120px; overflow-y: auto; font-family: monospace; font-size: 11px; color: #cbd5e1; margin-bottom: 8px; line-height: 1.4;">
      Chờ cấu hình API Key...
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="btn-toggle-auto" style="flex: 1; padding: 6px; background-color: #3b82f6; border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: bold;">Bật Auto</button>
      <button id="btn-solve-once" style="flex: 1; padding: 6px; background-color: #10b981; border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: bold;">Giải câu này</button>
    </div>
  `;

  document.body.appendChild(widget);

  // Gán sự kiện cho các nút trên widget
  document.getElementById('btn-toggle-auto').addEventListener('click', () => {
    config.autoSolve = !config.autoSolve;
    chrome.storage.local.set({ autoSolve: config.autoSolve });
    updateWidgetUI();
    addLog(`Đã chuyển Auto-Solve thành: ${config.autoSolve ? 'BẬT' : 'TẮT'}`);
    if (config.autoSolve) {
      checkAndSolve();
    }
  });

  document.getElementById('btn-solve-once').addEventListener('click', () => {
    addLog('Đang giải câu hiện tại...');
    solveQuestion(true);
  });
}

function addLog(message) {
  const logsDiv = document.getElementById('widget-logs');
  if (logsDiv) {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    logsDiv.innerHTML += `[${time}] ${message}<br>`;
    logsDiv.scrollTop = logsDiv.scrollHeight;
  }
  console.log(`[FSEL-AI-ASSISTANT] ${message}`);
}

function updateWidgetUI() {
  const statusSpan = document.getElementById('widget-status');
  const btnToggle = document.getElementById('btn-toggle-auto');
  
  if (statusSpan && btnToggle) {
    if (config.autoSolve) {
      statusSpan.textContent = 'Auto Bật';
      statusSpan.style.backgroundColor = '#10b981';
      btnToggle.textContent = 'Tắt Auto';
      btnToggle.style.backgroundColor = '#ef4444';
    } else {
      statusSpan.textContent = 'Auto Tắt';
      statusSpan.style.backgroundColor = '#64748b';
      btnToggle.textContent = 'Bật Auto';
      btnToggle.style.backgroundColor = '#3b82f6';
    }
  }
}

// 2. Load cấu hình từ Storage
function loadConfig() {
  chrome.storage.local.get(['geminiKey', 'autoSolve'], (result) => {
    if (result.geminiKey) {
      config.geminiKey = result.geminiKey;
      addLog('Đã nhận API Key Gemini.');
    } else {
      addLog('Cảnh báo: Chưa cài đặt API Key Gemini!');
    }
    if (result.autoSolve !== undefined) {
      config.autoSolve = result.autoSolve;
    }
    updateWidgetUI();
    if (config.autoSolve) {
      checkAndSolve();
    }
  });
}

// 3. Lắng nghe cập nhật từ popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'config_updated') {
    config = message.config;
    updateWidgetUI();
    addLog('Đã cập nhật cấu hình mới.');
    if (config.autoSolve) {
      checkAndSolve();
    }
    sendResponse({ success: true });
  }
});

// 4. Hàm cào câu hỏi và tự động giải
async function solveQuestion(force = false) {
  if (isSolving) return;
  if (!config.geminiKey) {
    addLog('Lỗi: Cần nhập API Key trước khi giải.');
    return;
  }

  isSolving = true;
  try {
    // Thu thập nội dung câu hỏi từ DOM
    // Tìm vùng chứa câu hỏi học tập (thường nằm trong thẻ có text hoặc class đặc thù)
    const bodyText = document.body.innerText;
    
    // Lấy tất cả các phần tử click được (có thể là đáp án trắc nghiệm)
    // Lọc ra các text của các button hoặc thẻ lựa chọn
    const clickableElements = Array.from(document.querySelectorAll('button, label, [role="button"], [class*="option"], [class*="choice"], [class*="answer"]'))
      .map(el => ({
        text: el.innerText.trim(),
        element: el
      }))
      .filter(item => item.text.length > 0 && item.text.length < 200 && !['Đăng xuất', 'Tiếp tục', 'Quay lại', 'Bật Auto', 'Giải câu này', 'Chat', 'VN', 'Nhấn để tiếp tục'].includes(item.text));

    if (clickableElements.length === 0) {
      addLog('Không tìm thấy phương án lựa chọn nào trên màn hình.');
      isSolving = false;
      return;
    }

    // Tạo danh sách các phương án để gửi cho Gemini
    const optionsText = clickableElements.map((item, idx) => `${idx}. "${item.text}"`).join('\n');
    
    addLog(`Đang gửi câu hỏi lên Gemini (Quét được ${clickableElements.length} phương án)...`);

    const prompt = `
Bạn là trợ lý học tập tiếng Anh thông minh. Dưới đây là nội dung toàn bộ văn bản hiển thị trên trang web học tập và các phương án lựa chọn click được.
Hãy phân tích câu hỏi đang hiển thị và chọn phương án trả lời ĐÚNG NHẤT trong danh sách các phương án cho sẵn.

NỘI DUNG TRANG WEB:
"""
${bodyText.substring(0, 3000)}
"""

DANH SÁCH CÁC PHƯƠNG ÁN LỰA CHỌN ĐỂ CLICK:
${optionsText}

Yêu cầu trả về: Chỉ trả về duy nhất một số nguyên tương ứng với chỉ số của phương án đúng (Ví dụ: "0" hoặc "1" hoặc "2"). Tuyệt đối không giải thích, không viết thêm bất kỳ ký tự nào khác ngoài số chỉ số đó.
`;

    // Gọi API thông qua background script để tránh lỗi CORS
    chrome.runtime.sendMessage({
      action: 'ask_gemini',
      data: { geminiKey: config.geminiKey, prompt }
    }, async (response) => {
      if (response && response.success) {
        const answerIdx = parseInt(response.text.trim());
        if (!isNaN(answerIdx) && answerIdx >= 0 && answerIdx < clickableElements.length) {
          const target = clickableElements[answerIdx];
          
          addLog(`Gemini chọn đáp án: [${answerIdx}] "${target.text}"`);
          
          // Giả lập thời gian suy nghĩ ngẫu nhiên từ 3 - 6 giây để chống hệ thống anti-bot
          const delay = 3000 + Math.random() * 3000;
          addLog(`Đang giả lập thời gian suy nghĩ (${(delay/1000).toFixed(1)}s)...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Click vào đáp án
          addLog(`Click chọn: "${target.text}"`);
          target.element.click();
          
          // Chờ 1.5 giây sau khi chọn đáp án, tự động click nút "Tiếp tục" hoặc "Nộp bài" nếu bật Auto
          if (config.autoSolve) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            clickNextButton();
          }
        } else {
          addLog(`Lỗi: AI trả về kết quả không hợp lệ: "${response.text}"`);
        }
      } else {
        addLog(`Lỗi gọi AI: ${response ? response.error : 'Không có phản hồi từ Background'}`);
      }
      isSolving = false;
    });

  } catch (err) {
    addLog(`Lỗi hệ thống: ${err.message}`);
    isSolving = false;
  }
}

// Tìm và tự động click nút "Tiếp tục" / "Tiếp theo"
async function clickNextButton() {
  const nextButtons = Array.from(document.querySelectorAll('button, [role="button"], a, span'))
    .filter(el => {
      const text = el.innerText.trim().toLowerCase();
      return text.includes('tiếp tục') || text.includes('tiếp theo') || text.includes('next') || text.includes('nộp bài') || text.includes('xác nhận') || text.includes('nộp');
    });

  if (nextButtons.length > 0) {
    addLog(`Tự động click nút chuyển tiếp: "${nextButtons[0].innerText.trim()}"`);
    nextButtons[0].click();
    
    // Đợi 3 giây để trang mới load hoàn toàn rồi tiếp tục kiểm tra câu hỏi tiếp theo
    setTimeout(() => {
      checkAndSolve();
    }, 4000);
  } else {
    addLog('Không tìm thấy nút chuyển câu/tiếp tục.');
  }
}

// 5. Hàm định kỳ kiểm tra xem có câu hỏi mới cần giải không
function checkAndSolve() {
  if (!config.autoSolve || isSolving) return;

  // Kiểm tra xem trang hiện tại có các nút lựa chọn để giải không
  const hasOptions = Array.from(document.querySelectorAll('button, label, [role="button"]'))
    .filter(el => el.innerText.trim().length > 0 && !['Đăng xuất', 'Tiếp tục', 'Quay lại', 'Bật Auto', 'Giải câu này', 'Chat', 'VN'].includes(el.innerText.trim())).length > 0;

  if (hasOptions) {
    // Nếu có tùy chọn trắc nghiệm và trang không chứa text welcome chào mừng test ban đầu
    const isWelcomePage = document.body.innerText.includes('Khởi đầu hành trình học tập cùng FSEL!');
    if (!isWelcomePage) {
      solveQuestion();
    } else {
      // Nếu là trang welcome, click "Bắt đầu ngay" để vào bài test
      const startBtn = document.querySelector('button:has-text("Bắt đầu ngay")') || Array.from(document.querySelectorAll('button')).find(el => el.innerText.includes('Bắt đầu ngay'));
      if (startBtn) {
        addLog('Tự động click "Bắt đầu ngay" để khởi chạy bài test...');
        startBtn.click();
        setTimeout(() => checkAndSolve(), 4000);
      }
    }
  }
}

// 6. Khởi động
setTimeout(() => {
  createWidget();
  loadConfig();
  
  // Thiết lập vòng lặp giám sát DOM (mỗi 5 giây kiểm tra 1 lần nếu không có tiến trình chạy)
  setInterval(() => {
    if (config.autoSolve && !isSolving) {
      checkAndSolve();
    }
  }, 6000);
}, 2000);
