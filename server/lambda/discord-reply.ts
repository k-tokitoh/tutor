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

  const thread = await REST.startThreadWithMessage(channelId, messageId, {
    name: "thread name", // todo: nameはUIに表示されるので、質問の内容がよさそう
    autoArchiveDuration: 10080,
  });

  // threadはなんとchannelの一種
  await REST.sendMessage(thread.id, {
    content: `questioned: ${question}`,
  });
  return;
};
