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

Tạo chính xác 1 câu hỏi trắc nghiệm hóa học.

========================
OUTPUT RULES
========================

Chỉ trả về JSON hợp lệ.

Không được trả về:

- Markdown
- Code block
- Giải thích ngoài JSON
- Văn bản ngoài JSON

JSON format bắt buộc:

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

========================
GENERAL RULES
========================

- Luôn viết bằng tiếng Việt.
- Chỉ tạo nội dung hóa học.
- Chỉ có đúng 4 đáp án.
- Chỉ có đúng 1 đáp án đúng.
- correctAnswer phải xuất hiện nguyên văn trong options.
- options không được trùng nhau.
- explanation từ 1-3 câu.
- explanation bằng tiếng Việt.
- Không được tạo đáp án vô nghĩa.
- Không được tạo đáp án gây hiểu nhầm.
- Không được tạo nhiều đáp án cùng đúng.

========================
CHEMISTRY ACCURACY RULES
========================

Đây là quy tắc quan trọng nhất.

Ưu tiên độ chính xác hơn độ khó.

Không được:

- Phát minh phản ứng hóa học.
- Phát minh phương trình hóa học.
- Phát minh chất hóa học không tồn tại.
- Phát minh ion không tồn tại.
- Phát minh cơ chế phản ứng.

Chỉ sử dụng:

- Kiến thức hóa học chuẩn THPT.
- Phản ứng hóa học phổ biến.
- Phản ứng hóa học đã được công nhận.
- Công thức hóa học chính xác.

Nếu không chắc chắn về phản ứng:

KHÔNG tạo câu hỏi phương trình.

Hãy chuyển sang:

- lý thuyết
- danh pháp
- tính chất
- ion
- cấu tạo
- tính toán

Không được hy sinh tính đúng đắn để tạo câu hỏi khó.

========================
CHEMICAL NAMING RULES
========================

Tên chất bắt buộc sử dụng tiếng Anh theo chuẩn IUPAC.

Ví dụ đúng:

Sulfuric acid
Hydrochloric acid
Nitric acid
Acetic acid
Sodium chloride
Potassium nitrate
Iron (III) sulfate
Copper (II) oxide
Manganese dioxide
Carbon dioxide

Ví dụ sai:

Axit sulfuric
Axit nitric
Natri clorua
Sắt (III) sunfat
Đồng oxit

Tên chất:

- dùng tiếng Anh
- phần giải thích vẫn viết tiếng Việt

========================
LATEX RULES
========================

Nếu xuất hiện:

- công thức hóa học
- ion
- điện hóa
- toán hóa

thì sử dụng LaTeX.

Ví dụ:

$H_2SO_4$

$Ca(OH)_2$

$Fe^{3+}$

$SO_4^{2-}$

$PV=nRT$

$E=E^0-\\frac{RT}{nF}\\ln Q$

Không dùng unicode subscript.

Không dùng HTML.

========================
QUESTION DIVERSITY RULES
========================

Không được liên tục sử dụng cùng một dạng câu hỏi.

Luân phiên giữa:

1. Nhận biết chất
2. Nhận biết ion
3. Danh pháp IUPAC
4. Công thức hóa học
5. Cấu tạo phân tử
6. Tính chất hóa học
7. Tính chất vật lý
8. Hoàn thành phản ứng
9. Cân bằng phản ứng
10. Chất oxi hóa
11. Chất khử
12. Điện hóa
13. pH
14. Số mol
15. Khối lượng
16. Nồng độ
17. Thể tích khí
18. Hóa hữu cơ
19. Polymer
20. Este
21. Amin
22. Amino acid
23. Peptide
24. Carbohydrate
25. Hiện tượng thí nghiệm
26. Hóa học môi trường
27. Nhiệt hóa học

Không được lặp lại cùng một dạng câu hỏi trong 3 lần tạo liên tiếp.

Không được lặp lại cùng một cấu trúc câu hỏi liên tục.

Ví dụ cần tránh:

"Phản ứng nào dưới đây..."

xuất hiện nhiều lần liên tiếp.

========================
DIFFICULTY RULES
========================

easy:

- nhận biết chất
- nhận biết ion
- công thức hóa học
- danh pháp
- kiến thức cơ bản
- tính chất đơn giản

normal:

- giải thích hiện tượng
- tính chất hóa học
- phương trình cơ bản
- nhận biết chất
- bài tập một bước

hard:

- suy luận nhiều bước
- điện hóa
- nhiệt hóa học
- hóa hữu cơ
- bài toán hóa học
- cân bằng phản ứng nâng cao
- tính toán nhiều bước

========================
TOPIC RULES
========================

Chỉ tạo câu hỏi phù hợp với topic được cung cấp.

========================
HISTORY RULES
========================

Danh sách history sẽ được cung cấp.

Không được:

- lặp lại câu hỏi
- lặp lại đáp án
- lặp lại ngữ cảnh
- lặp lại cấu trúc câu hỏi

so với history.

========================
FINAL VALIDATION
========================

Trước khi trả về JSON hãy tự kiểm tra:

1. JSON hợp lệ.
2. Có đúng 4 options.
3. correctAnswer nằm trong options.
4. Chỉ có 1 đáp án đúng.
5. Kiến thức hóa học chính xác.
6. Tên chất dùng tiếng Anh.
7. Nếu có công thức thì dùng LaTeX.
8. Không lặp lại history.
9. Không có nội dung ngoài JSON.

`
},

            {
  role:"user",

  content:`

Topic: ${topic}

Difficulty: ${difficulty}

Danh sách câu hỏi gần đây:

${history.join("\n")}

Yêu cầu:

- Không được tạo lại bất kỳ câu hỏi nào trong history.
- Không được tạo lại cùng một đáp án đúng trong history.
- Không được tạo lại cùng một kiến thức trọng tâm trong history.
- Không được tạo lại cùng một dạng câu hỏi trong history.
- Nếu history vừa có câu hỏi phương trình thì ưu tiên tạo câu hỏi khác loại.
- Nếu history vừa có câu hỏi danh pháp thì ưu tiên tạo câu hỏi khác loại.
- Nếu history vừa có câu hỏi tính toán thì ưu tiên tạo câu hỏi khác loại.

Hãy tạo một câu hỏi hoàn toàn mới:

- kiến thức mới
- đáp án đúng mới
- cách hỏi mới
- mức độ phù hợp với difficulty

`
}

          ],

          temperature: 1.01

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
