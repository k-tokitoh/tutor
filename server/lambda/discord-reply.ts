import "source-map-support/register";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

import { createRestManager } from "@discordeno/rest";
import { InteractionResponseTypes } from "@discordeno/types";
import { channel } from "diagnostics_channel";

export const handler = async (event: any) => {
  // todo: eventに型をつける
  console.log({ event });

  const REST = createRestManager({ token: process.env.DISCORD_TOKEN! });
  const channelId = event.channelId;
  const messageId = event.messageId;
  const question = event.question;

  const threadPromise = await REST.startThreadWithMessage(
    channelId,
    messageId,
    {
      name: question,
      autoArchiveDuration: 10080,
    }
  );

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-3.5-turbo",
  });

  // const messages = [
  //   // new SystemMessage(""),
  //   ...(replies.messages ?? []).map((m) => new HumanMessage(m.text ?? "")),
  // ];

  const answerPromise = model.invoke(question);

  const [thread, answer] = await Promise.all([threadPromise, answerPromise]);

  // threadはなんとchannelの一種
  await REST.sendMessage(thread.id, {
    content: answer.content.toString(),
  });
  return;
};
