export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }

  try {

    const {topic, difficulty = "normal", history = [] } = req.body;

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
- Nếu có công thức hóa học hoặc toán học:
Sử dụng LaTeX.
Ví dụ:
$H_2SO_4$
$Ca(OH)_2$
$Fe^{3+}$
$PV=nRT$
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

Difficulty Rules
easy:
- kiến thức cơ bản
- công thức đơn giản
- nhận biết chất
- nhận biết ion
normal:
- giải thích hiện tượng
- phương trình phản ứng
- tính chất hóa học
hard:
- bài toán hóa học
- suy luận nhiều bước
- cân bằng phản ứng phức tạp
- điện hóa
- hóa hữu cơ

Đặc biệt quan trọng:
Tên chất hóa học bắt buộc sử dụng danh pháp tiếng Anh theo đúng chuẩn IUPAC.
Ví dụ:
Sulfuric acid
Hydrochloric acid
Nitric acid
Sodium chloride
Iron (III) sulfate
Copper (II) oxide

- Không dùng tên tiếng Việt như:
Axit sulfuric
Natri clorua
Sắt (III) sunfat
`
},

            {
  role:"user",

  content:`

Topic: ${topic}
Difficulty: ${difficulty}

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
