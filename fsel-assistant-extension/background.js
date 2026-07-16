let currentKeyIndex = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ask_gemini') {
    const { geminiKeys, geminiModel, prompt } = request.data;
    
    if (!geminiKeys || !Array.isArray(geminiKeys) || geminiKeys.length === 0) {
      sendResponse({ success: false, error: 'Chưa cấu hình API Keys trong Extension.' });
      return true;
    }

    const modelName = geminiModel || 'gemini-1.5-flash';
    
    // Hàm thực hiện gọi API với cơ chế tự động thử lại bằng key tiếp theo nếu gặp lỗi
    function attemptCall(keyIdx, attemptsLeft) {
      const apiKey = geminiKeys[keyIdx];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      console.log(`[ROUND-ROBIN] Thử gọi model ${modelName} bằng Key chỉ số [${keyIdx}/${geminiKeys.length}]...`);
      
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        try {
          const replyText = data.candidates[0].content.parts[0].text;
          // Tăng chỉ số key cho lượt gọi tiếp theo (xoay vòng)
          currentKeyIndex = (keyIdx + 1) % geminiKeys.length;
          sendResponse({ 
            success: true, 
            text: replyText, 
            keyInfo: `[Key ${keyIdx + 1}/${geminiKeys.length}]` 
          });
        } catch (err) {
          throw new Error('Định dạng dữ liệu trả về từ Gemini không đúng.');
        }
      })
      .catch(error => {
        console.warn(`Lỗi khi sử dụng Key [${keyIdx}]: ${error.message}`);
        
        // Nếu còn key khác để thử và số lượt thử lại lớn hơn 0
        if (attemptsLeft > 1 && geminiKeys.length > 1) {
          const nextIdx = (keyIdx + 1) % geminiKeys.length;
          console.log(`[AUTO-RETRY] Chuyển sang thử Key tiếp theo: [${nextIdx}/${geminiKeys.length}]...`);
          attemptCall(nextIdx, attemptsLeft - 1);
        } else {
          // Hết key hoặc hết số lượt thử lại, trả về lỗi cuối cùng
          sendResponse({ success: false, error: `${error.message} (Đã thử qua các keys có sẵn nhưng đều thất bại)` });
        }
      });
    }

    // Khởi chạy lượt thử đầu tiên, số lần thử tối đa bằng số lượng key đang có
    attemptCall(currentKeyIndex, geminiKeys.length);
    
    // Trả về true để giữ cổng kết nối bất đồng bộ mở
    return true;
  }
});
