export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }

  try {

    const { topic } = req.body;

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
              role: "system",

              content: `
Create ONE chemistry multiple choice question.

Return ONLY valid JSON.

Format:

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
All content must be Vietnamese`
            },

            {
              role: "user",

              content:
                `Topic: ${topic}`
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
