import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { Collection, REST, Routes } from "discord.js";

import { getEnv, log } from "./utils.js";

const commandsPath = path.join(import.meta.dirname, "commands");

/** @type {Collection<string, import("./types.js").Command>} */
export const commands = new Collection();

/**
 * @param {string} dirPath
 * @returns {Promise<string[]>}
 */
async function getAllFiles(dirPath) {
  const files = await readdir(dirPath);
  const filePaths = [];
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      filePaths.push(...(await getAllFiles(filePath)));
    } else if (stats.isFile() && file.endsWith(".js")) {
      filePaths.push(filePath);
    }
  }
  return filePaths;
}

/** @typedef {import("./types.js").reloadCommandsFunctionType} reloadCommandsFunctionType */
export async function reloadCommands() {
  commands.clear();
  const commandFilePaths = await getAllFiles(commandsPath);
  for (const filePath of commandFilePaths) {
    log("Load command: " + filePath);
    const commandModule = await import(path.resolve(filePath));
    const command = commandModule.default ?? commandModule;

    commands.set(command.data.name, command);
  }
  log(`Loaded ${commands.size} commands`);
}

if (import.meta.main) {
  const rest = new REST().setToken(getEnv("DISCORD_TOKEN"));

  await reloadCommands();
  const body = [...commands.values()].map(command => command.data);
  await rest.put(Routes.applicationCommands(getEnv("APPLICATION_ID")), { body });
}
