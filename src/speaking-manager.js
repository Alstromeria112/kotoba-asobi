// TODO: デバッグ (バグ探し＋バグ修正)

import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";

import { log } from "./utils.js";
import { getVoiceData } from "./voicevox/voice.js";

class SpeakingQueue {
  #consuming = false;

  /** @type {Promise<AudioResource | null>[]} */
  #q = [];

  /** @type {AudioPlayer} */
  #audioPlayer;

  /** @type {VoiceConnection} */
  #voiceConnection;

  /** @param {VoiceConnection} voiceConnection */
  constructor(voiceConnection) {
    const dispose = () => {
      this.#q.length = 0;
      this.#audioPlayer.stop(true);
    };
    voiceConnection.on(VoiceConnectionStatus.Disconnected, dispose);
    voiceConnection.on(VoiceConnectionStatus.Destroyed, dispose);
    this.#voiceConnection = voiceConnection;
    this.#audioPlayer = getOrCreateAudioPlayer(voiceConnection);
  }

  /**
   * @param {string} speakerId
   * @param {string} text
   */
  push(speakerId, text) {
    switch (this.#voiceConnection.state.status) {
      case VoiceConnectionStatus.Destroyed:
      case VoiceConnectionStatus.Disconnected:
        return;
    }

    // Queue に Puromise をつめつめする
    this.#q.push(
      this.#textToVoiceAudioResource(speakerId, text).catch(e => {
        try {
          log(e);
        } catch {
          // ignore fatal error
        }
        return null;
      }),
    );

    this.#consume().catch(e => {
      try {
        log(e);
      } catch {
        // ignore fatal error
      }
    });
  }

  /**
   * テキストを受け取って，読み上げ音声データの入った AudioResource を返す非同期関数
   *
   * @param {string} speakerId
   * @param {string} text
   */
  async #textToVoiceAudioResource(speakerId, text) {
    const opusStream = await getVoiceData(speakerId, text);
    return createAudioResource(opusStream, { inputType: StreamType.OggOpus });
  }

  /** キューを処理する。 すでに consume 中ならなにもしない。 */
  async #consume() {
    if (this.#consuming) return;
    this.#consuming = true;
    try {
      for (;;) {
        const nextEntry = this.#q.shift();
        if (!nextEntry) break;
        const resource = await nextEntry;
        if (!resource) continue;
        this.#audioPlayer.play(resource);
        await entersState(this.#audioPlayer, AudioPlayerStatus.Playing, 10 * 1000);
        await entersState(this.#audioPlayer, AudioPlayerStatus.Idle, 24 * 60 * 60 * 1000);
      }
    } finally {
      this.#consuming = false;
    }
  }
}

export class ChannelTypeError extends Error {}

export class NotInVoiceChannelError extends Error {}

/** @type {WeakMap<VoiceConnection, SpeakingQueue>} */
const queues = new WeakMap();

/** @param {VoiceConnection} voiceConnection */
function getOrCreateSpeakingQueue(voiceConnection) {
  const existing = queues.get(voiceConnection);
  if (existing) return existing;
  const q = new SpeakingQueue(voiceConnection);
  queues.set(voiceConnection, q);
  return q;
}

/** @type {WeakMap<VoiceConnection, AudioPlayer>} */
const audioPlayers = new WeakMap();

/** @param {VoiceConnection} voiceConnection */
function getOrCreateAudioPlayer(voiceConnection) {
  const existing = audioPlayers.get(voiceConnection);
  if (existing) return existing;
  const audioPlayer = createAudioPlayer();
  voiceConnection.subscribe(audioPlayer);
  audioPlayers.set(voiceConnection, audioPlayer);
  return audioPlayer;
}

/**
 * @param {import("discord.js").Client} client
 * @param {string} voiceChannelId
 */
export async function join(client, voiceChannelId) {
  const vc = await client.channels.fetch(voiceChannelId);
  if (!vc?.isVoiceBased()) throw new ChannelTypeError("The specified channel is not a voice-based channel.");
  joinVoiceChannel({
    channelId: vc.id,
    guildId: vc.guild.id,
    adapterCreator: vc.guild.voiceAdapterCreator,
    selfDeaf: true,
  });
}

/**
 * @param {string} guildId
 * @param {string} speakerId
 * @param {string} text
 */
export function speak(guildId, speakerId, text) {
  const currentConnection = getVoiceConnection(guildId);
  if (!currentConnection) return;
  switch (currentConnection.state.status) {
    case VoiceConnectionStatus.Destroyed:
    case VoiceConnectionStatus.Disconnected:
      return;
  }

  getOrCreateSpeakingQueue(currentConnection).push(speakerId, text);
}

/** @param {string} guildId */
export function leave(guildId) {
  const conn = getVoiceConnection(guildId);
  if (!conn) throw new NotInVoiceChannelError("The bot doesn't has a voice connection");
  switch (conn.state.status) {
    case VoiceConnectionStatus.Destroyed:
    case VoiceConnectionStatus.Disconnected:
      throw new NotInVoiceChannelError("The bot doesn't has a voice connection");
  }

  conn.disconnect();
}
