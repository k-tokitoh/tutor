import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.on("ready", () => {
  console.log(`${client.user?.tag} でログインしています。`);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) {
    return;
  } else if (msg.content === "ping") {
    await msg
      .reply("pong")
      .then((reply) => console.log(`replied: ${reply}`))
      .catch(console.error);
    return;
  }
});

console.log({ token: process.env.DISCORD_BOT_TOKEN });

client.login(process.env.DISCORD_BOT_TOKEN);
