import { sendChatMessage } from "../src/shared/services/aiService";

export const summarizePost = async (text) => {
  try {
    const result = await sendChatMessage({
      prompt: `Summarize this for students in 2-3 short lines:\n\n${text}`,
      profile: {},
    });

    return result.answer;
  } catch (err) {
    return text.slice(0, 150) + "...";
  }
};
