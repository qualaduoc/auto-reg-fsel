// Background script xử lý gọi API Gemini để tránh lỗi CORS trên trang LMS FSEL
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ask_gemini') {
    const { geminiKey, prompt } = request.data;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    
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
        sendResponse({ success: true, text: replyText });
      } catch (err) {
        sendResponse({ success: false, error: 'Không thể phân tích phản hồi từ Gemini. Định dạng JSON có thể đã thay đổi.' });
      }
    })
    .catch(error => {
      console.error('Lỗi gọi Gemini API:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    // Trả về true để giữ cổng kết nối bất đồng bộ mở
    return true;
  }
});
