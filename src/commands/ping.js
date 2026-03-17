import { SlashCommandBuilder } from "discord.js";

/** @type {import("../types.js").Command} */
export default {
  data: new SlashCommandBuilder().setName("ping").setDescription("pong!"),

  async execute(interaction) {
    await interaction.reply({ content: interaction.client.ws.ping.toString() });
  },
};
