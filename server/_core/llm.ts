import { BUILT_IN_FORGE_API_KEY, BUILT_IN_FORGE_API_URL } from "./env.js";

export async function generateCompletion(
  prompt: string,
  model = "gpt-4o-mini"
): Promise<{ content: string }> {
  const response = await fetch(`${BUILT_IN_FORGE_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BUILT_IN_FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "あなたは平安時代の歌学者です。古典的な文体で和歌を評価してください。必ず指定された JSON 形式のみで返答してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `LLM API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return { content: data.choices[0].message.content };
}
