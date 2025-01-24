import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

import { createRestManager } from "@discordeno/rest";

export const handler = async (event: any) => {
  console.log({ event });

  const REST = createRestManager({
    token: process.env.DISCORD_TOKEN!,
  });

  const channelId = "1332201733757206592";

  await REST.sendMessage(channelId, { content: "hello" });
  return;
};
