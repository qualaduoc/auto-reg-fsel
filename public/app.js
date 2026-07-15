document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  const registerForm = document.getElementById('register-form');
  const btnSubmit = document.getElementById('btn-submit');
  const logsConsole = document.getElementById('logs-console');
  const processBadge = document.getElementById('process-badge');
  const historyTbody = document.getElementById('history-tbody');
  const accountCountBadge = document.getElementById('account-count');

  let accountCount = 0;
  let isProcessing = false;

  // Tải lịch sử tài khoản đã tạo trước đó
  loadHistory();

  // Khởi tạo kết nối SSE (Server-Sent Events) để nhận log
  setupEventSource();

  // Xử lý submit form
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isProcessing) return;

    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    const customEmail = document.getElementById('customEmail').value.trim();
    const province = document.getElementById('province').value;
    const grade = document.getElementById('grade').value;
    const headless = document.getElementById('headless').value === 'true';

    // Đổi giao diện sang trạng thái Đang xử lý
    setProcessingState(true);
    clearLogs();
    addLog('info', `[AETHER] Requesting registration ignition payload from local server...`);

    try {
      const response = await fetch('/api/start-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity,
          customEmail,
          province,
          grade,
          headless
        })
      });

      const result = await response.json();
      if (!result.success) {
        addLog('error', `[RUPTURE] Ignition request rejected: ${result.error}`);
        setProcessingState(false);
      } else {
        addLog('info', `[AETHER] Handshake success. Initializing sandboxed execution...`);
      }
    } catch (error) {
      addLog('error', `[RUPTURE] Backend connection failure: ${error.message}`);
      setProcessingState(false);
    }
  });

  // Thiết lập SSE nhận log
  function setupEventSource() {
    const eventSource = new EventSource('/api/logs-stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Xử lý các loại log
        if (data.type === 'account_created') {
          // Thêm tài khoản vừa tạo vào bảng
          addAccountToTable(data.data);
        } else {
          // Ghi đè trạng thái nếu hoàn tất hoặc có lỗi tổng thể
          if (data.message.includes('HOÀN TẤT TIẾN TRÌNH')) {
            setProcessingState(false);
            loadHistory(); // Reload lịch sử chính xác từ file
          }
          addLog(data.type, data.message, data.timestamp);
        }
      } catch (err) {
        console.error('Lỗi phân tích log SSE:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Lỗi kết nối SSE, đang thử kết nối lại...', err);
      addLog('error', '[RUPTURE] Log stream link terminated. Attempting automatic synapse reconnect...');
    };
  }

  // Thêm log vào console
  function addLog(type, message, time = null) {
    const timeStr = time || new Date().toLocaleTimeString();
    const logLine = document.createElement('div');
    logLine.className = `log-line log-${type}`;

    // Đổi icon tương ứng với loại log
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';
    if (type === 'progress') iconName = 'loader';

    logLine.innerHTML = `
      <span class="time">[${timeStr}]</span>
      <span class="msg">${message}</span>
    `;

    logsConsole.appendChild(logLine);
    // Tự động cuộn console xuống dưới cùng
    logsConsole.scrollTop = logsConsole.scrollHeight;
  }

  function clearLogs() {
    logsConsole.innerHTML = '';
  }

  // Thay đổi trạng thái UI của hệ thống
  function setProcessingState(processing) {
    isProcessing = processing;
    if (processing) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<i data-lucide="loader" class="animate-spin"></i> ĐANG CHẠY ĐĂNG KÝ...`;
      processBadge.textContent = 'Đang hoạt động';
      processBadge.className = 'badge badge-success';
    } else {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i data-lucide="play-circle"></i> BẮT ĐẦU ĐĂNG KÝ`;
      processBadge.textContent = 'Đang rảnh';
      processBadge.className = 'badge';
    }
    lucide.createIcons();
  }

  // Load lịch sử từ LocalStorage
  function loadHistory() {
    try {
      const accounts = getLocalAccounts();
      accountCount = accounts.length;
      accountCountBadge.textContent = `${accountCount} tài khoản`;
      
      if (accountCount === 0) {
        historyTbody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state">
              <i data-lucide="folder-open"></i>
              <p>Chưa có tài khoản nào được đăng ký trong phiên này. Hãy tiến hành đăng ký!</p>
            </td>
          </tr>
        `;
        lucide.createIcons();
        return;
      }

      historyTbody.innerHTML = '';
      accounts.forEach((acc, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${accountCount - idx}</td>
          <td style="font-weight: 500;">${escapeHtml(acc.fullName)}</td>
          <td>
            <code>${escapeHtml(acc.email)}</code>
            <span class="copy-badge" onclick="copyText('${escapeHtml(acc.email)}')"><i data-lucide="copy" style="width:12px;height:12px;"></i></span>
          </td>
          <td>
            <code>${escapeHtml(acc.password)}</code>
            <span class="copy-badge" onclick="copyText('${escapeHtml(acc.password)}')"><i data-lucide="copy" style="width:12px;height:12px;"></i></span>
          </td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(acc.school)}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(acc.timestamp)}</td>
          <td>
            <span class="copy-badge" onclick="copyCredentials('${escapeHtml(acc.email)}', '${escapeHtml(acc.password)}')">Copy cả hai</span>
          </td>
        `;
        historyTbody.appendChild(row);
      });
      lucide.createIcons();
    } catch (error) {
      console.error('Không thể load lịch sử local:', error);
    }
  }

  // Gán sự kiện click cho nút Tải Excel/CSV
  const btnDownloadAll = document.getElementById('btn-download-all');
  if (btnDownloadAll) {
    btnDownloadAll.addEventListener('click', downloadLocalCSV);
  }

  // Hàm xuất và tải file CSV từ LocalStorage của trình duyệt
  function downloadLocalCSV() {
    const accounts = getLocalAccounts();
    if (accounts.length === 0) {
      showToast('Chưa có tài khoản nào được tạo để tải về!');
      return;
    }
    
    let csvContent = '\ufeffEmail/Tên đăng nhập,Mật khẩu,Họ tên,Trường học,Thời gian tạo\n';
    accounts.forEach(acc => {
      csvContent += `"${acc.email}","${acc.password}","${acc.fullName}","${acc.school}","${acc.timestamp}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'danh_sach_tai_khoan.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải file Excel/CSV chứa tài khoản của bạn!');
  }

  // Thêm tài khoản thành công mới vào bảng ngay lập tức
  function addAccountToTable(acc) {
    const emptyRow = historyTbody.querySelector('.empty-state');
    if (emptyRow) {
      historyTbody.innerHTML = '';
    }

    accountCount++;
    accountCountBadge.textContent = `${accountCount} tài khoản`;

    const row = document.createElement('tr');
    row.style.animation = 'fadeIn 0.5s ease-out';
    row.innerHTML = `
      <td>${accountCount}</td>
      <td style="font-weight: 500;">${escapeHtml(acc.fullName)}</td>
      <td>
        <code>${escapeHtml(acc.email)}</code>
        <span class="copy-badge" onclick="copyText('${escapeHtml(acc.email)}')"><i data-lucide="copy" style="width:12px;height:12px;"></i></span>
      </td>
      <td>
        <code>${escapeHtml(acc.password)}</code>
        <span class="copy-badge" onclick="copyText('${escapeHtml(acc.password)}')"><i data-lucide="copy" style="width:12px;height:12px;"></i></span>
      </td>
      <td style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(acc.school)}</td>
      <td style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(acc.timestamp)}</td>
      <td>
        <span class="copy-badge" onclick="copyCredentials('${escapeHtml(acc.email)}', '${escapeHtml(acc.password)}')">Copy cả hai</span>
      </td>
    `;
    
    // Chèn lên đầu bảng
    historyTbody.insertBefore(row, historyTbody.firstChild);
    lucide.createIcons();
  }

  // Tiện ích chống XSS
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
  }
});

// Hàm Copy text
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Đã sao chép: ${text}`);
  }).catch(err => {
    console.error('Lỗi khi copy:', err);
  });
}

// Hàm Copy cả Email và Mật khẩu dạng: Email | Mật khẩu
function copyCredentials(email, password) {
  const text = `Tài khoản: ${email}\nMật khẩu: ${password}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Đã sao chép cả Tên đăng nhập và Mật khẩu!');
  }).catch(err => {
    console.error('Lỗi khi copy:', err);
  });
}

// Hàm hiển thị Toast thông báo đẹp mắt
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerText = message;
  document.body.appendChild(toast);
  
  // Style toast động
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    background: '#10b981',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
    zIndex: 99999,
    fontSize: '0.9rem',
    fontWeight: '500',
    animation: 'fadeIn 0.2s ease-out, fadeOut 0.2s ease-out 2.8s',
    pointerEvents: 'none'
  });

  // CSS Animation Fadeout
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
  `;
  document.head.appendChild(style);

  setTimeout(() => {
    toast.remove();
    style.remove();
  }, 3000);
}
