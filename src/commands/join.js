import { SlashCommandBuilder } from "discord.js";

import { join } from "../speaking-manager.js";

/** @type {import("../types.js").Command} */
export default {
  data: new SlashCommandBuilder().setName("join").setDescription("ボイスチャンネルに参加します"),

  async execute(interaction) {
    const { channelId } = interaction.member.voice;
    if (!channelId) {
      await interaction.reply("vcに入りやがってください");
      return;
    }
    await join(interaction.client, channelId);
    await interaction.reply("くるくるー");
  },
};
