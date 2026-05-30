export default async function handler(req, res) {
  try {
    const { message } = req.body;
    const isQuiz = req.body.mode === "quiz";

    // ✅ TẠO messages TRƯỚC
    const messages = isQuiz
      ? [
          {
            role: "system",
            content: `
Bạn là AI tạo câu hỏi trắc nghiệm Hóa học, các chất hóa học thì bạn sẽ luôn gọi tên bằng tiếng anh, còn nội dung câu hỏi thì tiếng việt.
  Tóm lại: 
  + Tiếng anh: Tên hóa chất, loại chất hóa học
  + Tiếng việt: Nội dung câu hỏi, tất cả ngoài trừ Tên hóa chất, loại chất hóa học
========================
QUY TẮC BẮT BUỘC TUYỆT ĐỐI (KHÔNG ĐƯỢC VI PHẠM)
========================

- MỌI công thức hóa học PHẢI nằm trong $...$

- TUYỆT ĐỐI KHÔNG:
  ❌ không viết C6H12O6
  ❌ không viết C_6H_12O_6
  ❌ không viết $$C_6H_12O_6$$ trong đáp án

- CHỈ ĐƯỢC VIẾT:
  ✔ $C_6H_12O_6$

- Nếu thiếu dấu $, PHẢI tự sửa trước khi trả kết quả

========================
TỰ KIỂM TRA TRƯỚC KHI TRẢ VỀ
========================

- Có công thức nào không nằm trong $...$ không?
→ Nếu có: SỬA

- Có $$ trong đáp án không?
→ Nếu có: ĐỔI thành $
- Trả về JSON hợp lệ (KHÔNG giải thích ngoài JSON)

{
  "question": "...",
  "options": {
    "A": "...",
    "B": "...",
    "C": "...",
    "D": "..."
  },
  "answer": "random",
  "explanation": "..."
}
`
          },
          {
            role: "user",
            content: `Tạo 1 câu hỏi về chủ đề: ${message}`
          }
        ]
      : [
          {
            role: "system",
            content: `
Bạn là trợ lý dạy Hóa, Tên các chất hóa học thì bạn luôn gọi tên bằng tiếng anh, còn nội dung trả lời thì bạn dùng tiếng việt.

QUY TẮC:
- Trong câu hỏi và đáp án:
  → PHẢI dùng dạng inline: $C_2H_4$

- CHỈ dùng $$ $$ khi viết phương trình riêng

Ví dụ:
- Đúng: ethylene $C_2H_4$
- Sai: ethylene $$C_2H_4$$

- Phương trình có thể dùng:
$$C_2H_4 + Br_2 → C_2H_4Br_2$$
`
          },
          { role: "user", content: message }
        ];

    // ✅ GỌI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages   // ✅ đúng chỗ
      })
    });

    const data = await response.json();

    console.log("DATA:", data);

    const reply = data.choices?.[0]?.message?.content || "AI chưa trả lời";

    res.status(200).json({ reply });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ reply: "Server lỗi thật 😢" });
  }
}
