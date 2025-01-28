import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.on("ready", () => {
  console.log(`${client.user?.tag} でログインしています。`);
});

client.on("messageCreate", async (msg) => {
  console.log("messageCreate", { msg });
  if (msg.content === "!ping") {
    msg.reply("Pong!");
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

// ================================
