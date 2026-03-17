import { SlashCommandBuilder } from "discord.js";

import { leave } from "../speaking-manager.js";

/** @type {import("../types.js").Command} */
export default {
  data: new SlashCommandBuilder().setName("leave").setDescription("ボイスチャンネルから切断します"),

  async execute(interaction) {
    await interaction.reply("ばいばい");
    leave(interaction.guildId);
  },
};
