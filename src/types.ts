import type { ChatInputCommandInteraction, Collection, SlashCommandBuilder } from "discord.js";

export type reloadCommandsFunctionType = <T extends Command>(
  commandDirPath: string,
  commandsCollection: Collection<string, T>,
) => void;

export interface Command {
  data: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void>;
}

/** https://voicevox.github.io/voicevox_engine/api/ */
export interface VvHttpValidationError {
  /** Detail */
  detail?: {
    /** Location */
    loc: (string | number)[];
    /** Message */
    msg: string;
    /** Error Type */
    type: string;
    /** Input */
    input?: unknown;
    /** Context */
    ctx?: Record<string, never>;
  }[];
}
