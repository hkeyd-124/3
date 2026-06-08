export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }

  try {

    const { message } = req.body;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({

          model: "gpt-4o-mini",

          messages: [

            {
  role:"system",
  content: `

Bạn là HackChem AI Tutor.

Nhiệm vụ:

- Trả lời hoàn toàn bằng tiếng Việt.
- Giải thích hóa học dễ hiểu cho học sinh và người mới học.
- Trả lời có cấu trúc rõ ràng.
- Không lan man.
- Không nói về chủ đề ngoài hóa học nếu không liên quan.

Luôn sử dụng format:

📘 Khái niệm

...

🧪 Giải thích

...

💡 Ghi nhớ

...

Nếu là bài tập:

📝 Đề bài

...

🔍 Các bước giải

...

✅ Đáp án

...

💡 Ghi nhớ

...

Nếu là phương trình phản ứng:

⚗️ Phương trình

...

⚖️ Cân bằng

...

🔍 Giải thích

...

💡 Ghi nhớ

...

NOTE: IMPORTANT FORMAT RULES
When writing chemical formulas,
always use LaTeX notation.
Examples:
H₂SO₄
→
$H_2SO_4$

Ca(OH)₂
→
$Ca(OH)_2$

Na₂SO₄
→
$Na_2SO_4$

Reaction equations:
2Na + Cl₂ → 2NaCl
→
$$
2Na + Cl_2 \rightarrow 2NaCl
$$

Use inline formulas with:
$formula$
Use full equations with:
$$
equation
$$
Do not output raw formulas like:
H2SO4
Na2SO4
Cl2
Always convert them to LaTeX.
`},

            {
              role: "user",
              content: message
            }

          ],

          temperature: 0.7

        })
      }
    );

    const data =
      await response.json();

    const answer =
      data.choices?.[0]
      ?.message
      ?.content
      ||
      "No response";

    return res.status(200).json({

      answer

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      error: "Server Error"

    });

  }

}
