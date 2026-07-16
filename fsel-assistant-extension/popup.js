document.addEventListener('DOMContentLoaded', () => {
  const geminiKeyInput = document.getElementById('gemini-key');
  const autoSolveToggle = document.getElementById('auto-solve-toggle');
  const btnSave = document.getElementById('btn-save');
  const statusMsg = document.getElementById('status-msg');

  // Load config cũ
  chrome.storage.local.get(['geminiKey', 'autoSolve'], (result) => {
    if (result.geminiKey) {
      geminiKeyInput.value = result.geminiKey;
    }
    if (result.autoSolve !== undefined) {
      autoSolveToggle.checked = result.autoSolve;
    }
  });

  // Lưu cấu hình
  btnSave.addEventListener('click', () => {
    const geminiKey = geminiKeyInput.value.trim();
    const autoSolve = autoSolveToggle.checked;

    if (!geminiKey) {
      showStatus('Vui lòng nhập API Key!', 'error');
      return;
    }

    chrome.storage.local.set({ geminiKey, autoSolve }, () => {
      showStatus('Lưu cấu hình thành công!', 'success');
      
      // Gửi message cập nhật cấu hình cho Content Script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'config_updated', 
            config: { geminiKey, autoSolve } 
          }).catch(err => {
            // Có thể tab hiện tại không phải FSEL LMS, bỏ qua lỗi này
          });
        }
      });
    });
  });

  function showStatus(text, type) {
    statusMsg.textContent = text;
    statusMsg.className = `status-msg status-${type}`;
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 3000);
  }
});
