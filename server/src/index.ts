import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildExpressions,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
    GatewayIntentBits.GuildMessagePolls,
    GatewayIntentBits.DirectMessagePolls,
  ],
});

client.on("ready", () => {
  console.log(`${client.user?.tag} でログインしています。`);
});

client.on("messageCreate", async (msg) => {
  console.log("messageCreate", { msg });
  console.log("msg.author.bot", msg.author.bot);

  if (msg.author.bot) {
    return;
  } else {
    await msg
      .reply(`Hello, ${msg.author}! You said: ${msg.content}`)
      .then((reply: unknown) => console.log(`Replied: ${reply}`))
      .catch(console.error);
    return;
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

// ================================
