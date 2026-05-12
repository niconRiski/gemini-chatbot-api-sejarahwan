const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

let conversationHistory = [];

// === LOGIC LOGIN & GREETING ===
const username = localStorage.getItem('username');
const overlay = document.getElementById('greeting-overlay');
const greetingText = document.getElementById('greeting-text');
const logoutBtn = document.getElementById('logout-btn');

if (!username) {
  // Jika belum login, alihkan ke halaman login
  window.location.href = 'login.html';
} else {
  // Tampilkan pesan bahwa aplikasi sedang meminta akses lokasi
  greetingText.innerHTML = `Selamat datang, ${username}!<br><span style="font-size: 16px; color: #e0e0e0; text-shadow: none; font-weight: normal; margin-top: 15px; display: block; letter-spacing: 0;">Meminta akses lokasi Anda untuk pengalaman sejarah yang lebih baik... 📍</span>`;

  (async () => {
    let userCity = '';
    try {
      // 1. Meminta perizinan lokasi menggunakan API browser (muncul popup allow/block)
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      
      const { latitude, longitude } = position.coords;
      
      // 2. Mengubah koordinat menjadi nama daerah menggunakan OpenStreetMap (Reverse Geocoding)
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
      const data = await response.json();
      
      if (data && data.address) {
        userCity = data.address.city || data.address.regency || data.address.county || data.address.town || data.address.state || '';
      }
    } catch (error) {
      console.warn("Gagal atau akses lokasi ditolak:", error);
      // Tambahkan alert untuk membantu mendebug kenapa lokasi tidak muncul
      alert("Gagal memuat lokasi! Pastikan Anda membuka web lewat http://localhost:3000 (bukan file://) dan mengizinkan pop-up lokasi di pengaturan browser.");
    }

    // Ubah teks sapaan setelah lokasi didapat atau dilewati
    greetingText.innerHTML = `Selamat datang, ${username}!<br><span style="font-size: 16px; color: #e0e0e0; text-shadow: none; font-weight: normal; margin-top: 15px; display: block; letter-spacing: 0;">Mari menjelajahi lorong waktu dan mengungkap kisah masa lampau Nusantara. 📜</span>`;

    setTimeout(() => {
      overlay.classList.add('hidden');
      
      setTimeout(() => {
        // 3. Modifikasi pesan utama chatbot dengan nama daerah
        let botGreeting = '';
        if (userCity) {
          botGreeting = `Halo ${username}! Saya adalah chatbot Sejarawan Indonesia, lokasi Anda sekarang ada di daerah ${userCity}. Apakah Anda ingin tahu sejarah tentang ${userCity}?`;
        } else {
          botGreeting = `Halo ${username}! Saya adalah chatbot Sejarawan Indonesia, ada yang bisa saya bantu hari ini?`;
        }

        appendMessage('bot', botGreeting);
        conversationHistory.push({ role: 'model', text: botGreeting });
        
        // 4. Tampilkan tombol suggestion chips
        const chipsContainer = document.querySelector('.suggestion-chips');
        chipsContainer.classList.add('visible');

        // 5. Tambahkan tombol dinamis berdasarkan kota secara otomatis
        if (userCity) {
          const newChip = document.createElement('button');
          newChip.className = 'chip';
          newChip.textContent = `Sejarah ${userCity}`;
          chipsContainer.insertBefore(newChip, chipsContainer.firstChild);
          attachChipListener(newChip); // Berikan aksi klik ke tombol baru
        }
      }, 500);
    }, 2500); // Overlay ditahan selama 2.5 detik agar tulisan terbaca
  })();
}

// Logika ketika tombol logout ditekan
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('username');
  window.location.href = 'login.html';
});

// === LOGIC SUGGESTION CHIPS ===
function attachChipListener(chip) {
  chip.addEventListener('click', () => {
    const message = chip.textContent;
    // Set the input value and trigger the form submission logic
    input.value = message;
    // Create a new submit event
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    // Dispatch the event on the form
    form.dispatchEvent(submitEvent);
  });
}

const suggestionChips = document.querySelectorAll('.chip');
suggestionChips.forEach(chip => attachChipListener(chip));

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  conversationHistory.push({ role: 'user', text: userMessage });

  input.value = '';

  // Show placeholder message and keep a reference to its DOM element
  const botMessageElement = appendMessage('bot', 'Thinking...');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversation: conversationHistory })
    });

    const data = await response.json();

    if (response.ok && data.result) {
      botMessageElement.innerHTML = marked.parse(data.result);
      conversationHistory.push({ role: 'model', text: data.result });
    } else {
      botMessageElement.textContent = 'Sorry, no response received.';
    }
  } catch (error) {
    console.error('Chat error:', error);
    botMessageElement.textContent = 'Failed to get response from server.';
  }
});

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}
