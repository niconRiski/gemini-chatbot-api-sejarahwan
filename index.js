import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
// Mengikuti gambar: import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenerativeAI } from '@google/generative-ai';

// ==== Tambahan setup __dirname untuk ESM (import style) ====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Memasukkan API Key secara langsung
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Gunakan gemini-1.5-flash agar terhindar dari limit dan error server sibuk
const GEMINI_MODEL = 'gemini-2.5-flash';

app.use(cors());
app.use(express.json());

// ==== Tambahan middleware untuk serve file static (frontend) ====
// Serve all files in public_solution (HTML, JS, CSS) at root path
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3000;
app.listen(PORT, () => { 
    console.log(`Server ready on http://localhost:${PORT}`); 
});

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    try {
        if (!Array.isArray(conversation)) throw new Error('Messages must be an array!');

        const systemInstruction = "Anda adalah 'Sejarawan Indonesia', seorang asisten AI yang berpengetahuan luas tentang sejarah negara Indonesia. Gaya bicara Anda ramah, edukatif, dan inspiratif. ATURAN SANGAT PENTING: Anda HANYA BOLEH menjawab pertanyaan yang berkaitan dengan sejarah nasional Indonesia, kerajaan Nusantara, masa penjajahan, kemerdekaan, tokoh pahlawan, dan budaya Indonesia. Jika pengguna bertanya hal di luar topik tersebut (seperti matematika, teknologi, berita terkini, atau sejarah negara lain tanpa kaitan dengan Indonesia), Anda HARUS MENOLAKNYA dengan tegas dan sopan, lalu mengingatkan mereka bahwa spesialisasi Anda hanyalah Sejarah Indonesia.";

        // Menggunakan variabel 'ai' sesuai inisialisasi di atas
        const model = ai.getGenerativeModel({ 
            model: GEMINI_MODEL,
            systemInstruction: systemInstruction,
        });

        const contents = conversation.map(({ role, text }) => ({
            role: role === 'user' ? 'user' : 'model',
            parts: [{ text }]
        }));

        const result = await model.generateContent({
            contents,
            generationConfig: {
                temperature: 0.5,
            }
        });

        const response = await result.response;
        res.status(200).json({ result: response.text() });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});