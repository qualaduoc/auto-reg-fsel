document.addEventListener('DOMContentLoaded', () => {
  const geminiKeysInput = document.getElementById('gemini-keys');
  const geminiModelSelect = document.getElementById('gemini-model');
  const autoSolveToggle = document.getElementById('auto-solve-toggle');
  const btnSave = document.getElementById('btn-save');
  const statusMsg = document.getElementById('status-msg');

  // Load config cũ
  chrome.storage.local.get(['geminiKeys', 'geminiModel', 'autoSolve'], (result) => {
    if (result.geminiKeys && Array.isArray(result.geminiKeys)) {
      geminiKeysInput.value = result.geminiKeys.join('\n');
    }
    if (result.geminiModel) {
      geminiModelSelect.value = result.geminiModel;
    }
    if (result.autoSolve !== undefined) {
      autoSolveToggle.checked = result.autoSolve;
    }
  });

  // Lưu cấu hình
  btnSave.addEventListener('click', () => {
    const rawKeys = geminiKeysInput.value.trim();
    const geminiModel = geminiModelSelect.value;
    const autoSolve = autoSolveToggle.checked;

    if (!rawKeys) {
      showStatus('Vui lòng nhập ít nhất 1 API Key!', 'error');
      return;
    }

    // Tách các keys bằng dấu xuống dòng và lọc các dòng trống
    const geminiKeys = rawKeys.split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (geminiKeys.length === 0) {
      showStatus('Vui lòng nhập ít nhất 1 API Key hợp lệ!', 'error');
      return;
    }

    chrome.storage.local.set({ geminiKeys, geminiModel, autoSolve }, () => {
      showStatus(`Đã lưu ${geminiKeys.length} keys & Model!`, 'success');
      
      // Gửi message cập nhật cấu hình cho Content Script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'config_updated', 
            config: { geminiKeys, geminiModel, autoSolve } 
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
