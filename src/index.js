import assert from "node:assert/strict";

import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";

import { commands, reloadCommands } from "./commands-manager.js";
import { speak } from "./speaking-manager.js";
import { getEnv, log } from "./utils.js";

const ttsChannelId = getEnv("TEXT_CHANNEL_ID");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once(Events.ClientReady, client => {
  log(`Logged in as ${client.user.tag}`);
});

const normalVoices = ["2", "3", "8", "10", "9", "11", "12", "13", "14", "16", "20", "21", "23", "27", "29", "42", "43", "46", "47", "51", "52", "53", "54", "55", "58", "61", "67", "68", "69", "74", "89", "90", "94", "99", "100", "102", "107", "108", "109", "113"];
const emojiRegex = /\p{Extended_Pictographic}/ug;

client.on(Events.MessageCreate, async message => {
  const isSelf = message.author.id === client.user?.id;
  const isAllowedChannel = message.channelId === ttsChannelId;
  const isOcto = message.author.id === getEnv("OCTO_USER_ID");

  const cleanText = message.cleanContent.replace(emojiRegex, "");
  if (cleanText.length && !isSelf && message.inGuild() && isAllowedChannel && !isOcto) {
    const speakerId = normalVoices[Number(message.webhookId ?? message.author.id) % normalVoices.length];
    assert(speakerId);
    speak(message.guildId, speakerId, cleanText);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.inCachedGuild() || !interaction.isChatInputCommand()) return;
  const commandName = interaction.commandName;
  const command = commands.get(commandName);
  if (!command) {
    log(`Unknown command: ${commandName}`);
    await interaction.reply({ content: "Unknown command", flags: [MessageFlags.Ephemeral] });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (e) {
    log(`Error executing command: ${commandName}: ${e}`);
  }
});

await reloadCommands();

client.login();
