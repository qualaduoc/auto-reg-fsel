// Content Script chạy trực tiếp trên trang lms.fsel.edu.vn
let config = { geminiKeys: [], geminiModel: 'gemini-1.5-flash', autoSolve: false };
let isSolving = false;
let savedLessonContent = ''; // Lưu trữ đề bài/đoạn văn đọc

// 1. Tạo widget điều khiển hiển thị ở góc màn hình
function createWidget() {
  if (document.getElementById('fsel-helper-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'fsel-helper-widget';
  widget.style.position = 'fixed';
  widget.style.bottom = '20px';
  widget.style.right = '20px';
  widget.style.zIndex = '999999';
  widget.style.backgroundColor = '#0f172a'; // Sleek Dark Mode
  widget.style.color = '#f8fafc';
  widget.style.border = '1px solid #334155';
  widget.style.borderRadius = '14px';
  widget.style.padding = '16px';
  widget.style.width = '300px';
  widget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4)';
  widget.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  widget.style.fontSize = '13px';
  widget.style.transition = 'all 0.3s ease';

  widget.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
      <span style="font-weight: bold; font-size: 14px; color: #3b82f6; display: flex; align-items: center; gap: 6px;">
        🤖 FSEL AI Assistant
      </span>
      <span id="widget-status" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background-color: #64748b; color: white; font-weight: bold;">Sẵn sàng</span>
    </div>

    <!-- Khu vực hiển thị đề bài đã lưu -->
    <div style="margin-bottom: 12px; background-color: #1e293b; border-radius: 8px; padding: 10px; border: 1px solid #334155;">
      <div style="font-weight: 600; color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
        <span>📖 Đề bài đã lưu:</span>
        <a href="javascript:void(0)" id="btn-clear-lesson" style="color: #ef4444; text-decoration: none; font-size: 10px; display: none;">[Xóa Đề]</a>
      </div>
      <div id="lesson-preview" style="font-size: 12px; color: #cbd5e1; max-height: 48px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: italic;">
        Chưa có đề bài. Bôi đen văn bản rồi nhấn "Lưu Đề bài"
      </div>
    </div>

    <!-- Khu vực nút bấm thao tác -->
    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
      <div style="display: flex; gap: 8px;">
        <button id="btn-save-lesson" style="flex: 1; padding: 8px 10px; background-color: #2563eb; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold; font-size: 12px; transition: background 0.2s;">
          1. Lưu Đề bài
        </button>
        <button id="btn-solve-question" style="flex: 1; padding: 8px 10px; background-color: #10b981; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold; font-size: 12px; transition: background 0.2s;">
          2. Giải câu này
        </button>
      </div>
    </div>

    <!-- Khu vực HIỂN THỊ ĐÁP ÁN GỢI Ý (Premium Box) -->
    <div style="margin-bottom: 12px; background-color: #0284c7; border-radius: 8px; padding: 12px; border: 1px solid #0284c7; min-height: 50px; display: flex; flex-direction: column; justify-content: center; transition: all 0.3s ease;" id="ai-answer-box">
      <div style="font-weight: bold; color: #e0f2fe; font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">🎯 Gợi ý đáp án của AI:</div>
      <div id="ai-answer-content" style="font-size: 13px; font-weight: 500; color: #ffffff; line-height: 1.5; text-align: left;">
        Bôi đen câu hỏi rồi nhấn "Giải câu này" để xem gợi ý.
      </div>
    </div>

    <!-- Nhật ký logs thu nhỏ -->
    <div id="widget-logs" style="max-height: 60px; overflow-y: auto; font-family: monospace; font-size: 10px; color: #94a3b8; line-height: 1.4; border-top: 1px solid #334155; padding-top: 8px;">
      Tiện ích đã được kích hoạt.
    </div>
  `;

  document.body.appendChild(widget);

  // 1. Sự kiện lưu Đề bài (Lấy từ phần bôi đen)
  document.getElementById('btn-save-lesson').addEventListener('click', () => {
    const selection = window.getSelection().toString().trim();
    if (!selection) {
      alert('Vui lòng bôi đen (quét khối) đoạn văn hoặc đề bài trên trang web trước khi bấm lưu!');
      return;
    }
    savedLessonContent = selection;
    
    // Cập nhật giao diện
    const previewDiv = document.getElementById('lesson-preview');
    const clearBtn = document.getElementById('btn-clear-lesson');
    previewDiv.textContent = selection;
    previewDiv.style.fontStyle = 'normal';
    clearBtn.style.display = 'inline';
    
    addLog(`Đã lưu Đề bài (${selection.length} ký tự).`);
  });

  // 2. Sự kiện xóa Đề bài
  document.getElementById('btn-clear-lesson').addEventListener('click', () => {
    savedLessonContent = '';
    const previewDiv = document.getElementById('lesson-preview');
    const clearBtn = document.getElementById('btn-clear-lesson');
    previewDiv.textContent = 'Chưa có đề bài. Bôi đen văn bản rồi nhấn "Lưu Đề bài"';
    previewDiv.style.fontStyle = 'italic';
    clearBtn.style.display = 'none';
    addLog('Đã xóa Đề bài.');
  });

  // 3. Sự kiện giải câu hỏi (Lấy từ phần bôi đen câu hỏi)
  document.getElementById('btn-solve-question').addEventListener('click', () => {
    const selection = window.getSelection().toString().trim();
    solveSelectedQuestion(selection);
  });
}

function addLog(message) {
  const logsDiv = document.getElementById('widget-logs');
  if (logsDiv) {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    logsDiv.innerHTML = `[${time}] ${message}`; // Chỉ hiển thị dòng log mới nhất để tiết kiệm không gian
  }
  console.log(`[FSEL-AI-ASSISTANT] ${message}`);
}

function setWidgetStatus(statusText, color = '#64748b') {
  const statusSpan = document.getElementById('widget-status');
  if (statusSpan) {
    statusSpan.textContent = statusText;
    statusSpan.style.backgroundColor = color;
  }
}

// Load cấu hình từ Storage
function loadConfig() {
  chrome.storage.local.get(['geminiKeys', 'geminiModel'], (result) => {
    if (result.geminiKeys && Array.isArray(result.geminiKeys) && result.geminiKeys.length > 0) {
      config.geminiKeys = result.geminiKeys;
      config.geminiModel = result.geminiModel || 'gemini-1.5-flash';
      addLog(`Đã nhận ${result.geminiKeys.length} keys. Model: ${config.geminiModel}`);
    } else {
      chrome.storage.local.get(['geminiKey'], (oldResult) => {
        if (oldResult.geminiKey) {
          config.geminiKeys = [oldResult.geminiKey];
          config.geminiModel = 'gemini-1.5-flash';
          addLog('Đã nhận 1 API Key.');
        } else {
          addLog('Cảnh báo: Chưa cấu hình API Keys!');
        }
      });
    }
  });
}

// Lắng nghe cập nhật từ popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'config_updated') {
    config = message.config;
    addLog(`Đã cập nhật cấu hình keys mới.`);
    sendResponse({ success: true });
  }
});

// Hàm gửi câu hỏi bôi đen lên AI và hiển thị gợi ý
async function solveSelectedQuestion(questionText) {
  if (isSolving) return;
  if (!questionText) {
    alert('Vui lòng bôi đen (quét khối) câu hỏi cần làm trên trang web trước khi bấm giải!');
    return;
  }

  if (!config.geminiKeys || config.geminiKeys.length === 0) {
    addLog('Lỗi: Cần nhập API Keys trước khi giải.');
    alert('Vui lòng click vào biểu tượng Extension ở thanh công cụ Chrome để cấu hình API Keys trước!');
    return;
  }

  isSolving = true;
  setWidgetStatus('Đang giải...', '#eab308');
  
  const answerContent = document.getElementById('ai-answer-content');
  const answerBox = document.getElementById('ai-answer-box');
  
  answerBox.style.backgroundColor = '#1e293b'; // Trả về màu nền xám lúc đang suy nghĩ
  answerContent.textContent = 'Đang phân tích và giải câu hỏi bằng AI...';
  
  try {
    addLog(`Đang gửi câu hỏi lên Gemini (Model: ${config.geminiModel})...`);

    const prompt = `
Bạn là giáo viên tiếng Anh hỗ trợ học sinh giải bài tập. 
Hãy đọc ĐỀ BÀI/ĐOẠN VĂN ĐỌC sau (nếu có) và trả lời CÂU HỎI kèm các phương án lựa chọn được cung cấp.

${savedLessonContent ? `ĐỀ BÀI/ĐOẠN VĂN ĐỌC:\n"""\n${savedLessonContent}\n"""\n\n` : ''}
CÂU HỎI VÀ PHƯƠNG ÁN LỰA CHỌN:
"""
${questionText}
"""

Yêu cầu: Hãy phân tích đoạn văn và câu hỏi, suy nghĩ kỹ và đưa ra phương án trả lời đúng nhất. 
Trả về câu trả lời thật ngắn gọn và rõ ràng dưới dạng:
👉 AI GỢI Ý: Chọn đáp án [Tên đáp án đúng] vì [giải thích siêu ngắn gọn trong 1 câu tiếng Việt].
`;

    // Gọi API thông qua background script để tránh lỗi CORS
    chrome.runtime.sendMessage({
      action: 'ask_gemini',
      data: { geminiKeys: config.geminiKeys, geminiModel: config.geminiModel, prompt }
    }, (response) => {
      if (response && response.success) {
        const keyInfo = response.keyInfo || '';
        const reply = response.text.trim();
        
        // Cập nhật giao diện đáp án gợi ý
        answerBox.style.backgroundColor = '#16a34a'; // Màu xanh lá cây báo thành công
        answerContent.innerHTML = reply.replace(/\n/g, '<br>');
        
        addLog(`${keyInfo} Giải quyết thành công.`);
        setWidgetStatus('Hoàn thành', '#10b981');
      } else {
        const errMsg = response ? response.error : 'Không có phản hồi từ Background';
        answerBox.style.backgroundColor = '#7f1d1d'; // Màu đỏ sẫm báo lỗi
        answerContent.textContent = `Lỗi: ${errMsg}`;
        addLog(`Lỗi: ${errMsg}`);
        setWidgetStatus('Lỗi', '#ef4444');
      }
      isSolving = false;
    });

  } catch (err) {
    answerBox.style.backgroundColor = '#7f1d1d';
    answerContent.textContent = `Lỗi hệ thống: ${err.message}`;
    addLog(`Lỗi hệ thống: ${err.message}`);
    setWidgetStatus('Lỗi', '#ef4444');
    isSolving = false;
  }
}

// Khởi động
setTimeout(() => {
  createWidget();
  loadConfig();
}, 2000);
