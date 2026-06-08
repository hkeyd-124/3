export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }

  try {

    const {topic, history = [] } = req.body;

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

          response_format: {
            type: "json_object"
          },

          messages: [

            {
  role:"system",
  content:`

Bạn là HackChem AI Quiz Generator.

Nhiệm vụ:

Tạo đúng 1 câu hỏi trắc nghiệm hóa học.

Quy tắc:

- Luôn viết bằng tiếng Việt.
- Chỉ tạo câu hỏi hóa học.
- Chỉ tạo 4 đáp án.
- Chỉ có 1 đáp án đúng.
- Các đáp án nhiễu phải hợp lý.
- Không tạo đáp án vô nghĩa.
- Không sử dụng markdown.
- Không sử dụng code block.
- Không giải thích ngoài JSON.

Trả về JSON đúng format:

{
  "question":"...",
  "options":[
    "...",
    "...",
    "...",
    "..."
  ],
  "correctAnswer":"...",
  "explanation":"..."
}

Yêu cầu:

- correctAnswer phải xuất hiện trong options.
- options không được trùng nhau.
- explanation từ 1-3 câu.
- explanation bằng tiếng Việt.
- Không thêm bất kỳ ký tự nào ngoài JSON.

`
},

            {
  role:"user",

  content:`

Topic: ${topic}

Không được tạo lại
các câu hỏi sau:

${history.join("\n")}

Tạo một câu hỏi mới
khác hoàn toàn các câu trên.

`
}

          ],

          temperature: 0.9

        })
      }
    );

    const data =
      await response.json();

    const content =
      data.choices?.[0]
      ?.message
      ?.content;

    return res.status(200).json(
      JSON.parse(content)
    );

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      error: "Server Error"

    });

  }

}
