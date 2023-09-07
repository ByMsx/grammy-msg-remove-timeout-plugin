/**
 * MAIN PLUGIN CODE HERE
 */

import { Autoremover, MessagesToRemove } from "./autoremove.ts";
import {
  Api,
  Context,
  Message,
  NextFunction,
  StorageAdapter,
} from "./deps.deno.ts";

type ExtendOptions<T> = T & { timeout?: number };

export interface AutoremoveContext<C extends Context> {
  reply: (
    text: Parameters<C["reply"]>[0],
    other?: ExtendOptions<Parameters<C["reply"]>[1]>,
    signal?: Parameters<C["reply"]>[2],
  ) => ReturnType<C["reply"]>;
  replyWithPhoto: (
    photo: Parameters<C["replyWithPhoto"]>[0],
    other?: ExtendOptions<Parameters<C["replyWithPhoto"]>[1]>,
    signal?: Parameters<C["replyWithPhoto"]>[2],
  ) => ReturnType<C["replyWithPhoto"]>;
  replyWithAudio: (
    audio: Parameters<C["replyWithAudio"]>[0],
    other?: ExtendOptions<Parameters<C["replyWithAudio"]>[1]>,
    signal?: Parameters<C["replyWithAudio"]>[2],
  ) => ReturnType<C["replyWithAudio"]>;
  replyWithDocument: (
    document: Parameters<C["replyWithDocument"]>[0],
    other?: ExtendOptions<Parameters<C["replyWithDocument"]>[1]>,
    signal?: Parameters<C["replyWithDocument"]>[2],
  ) => ReturnType<C["replyWithDocument"]>;
  replyWithVideo: (
    video: Parameters<C["replyWithVideo"]>[0],
    other?: ExtendOptions<Parameters<C["replyWithVideo"]>[1]>,
    signal?: Parameters<C["replyWithVideo"]>[2],
  ) => ReturnType<C["replyWithVideo"]>;
  replyWithAnimation: (
    animation: Parameters<C["replyWithAnimation"]>[0],
    other?: ExtendOptions<Parameters<C["replyWithAnimation"]>[1]>,
    signal?: Parameters<C["replyWithAnimation"]>[2],
  ) => ReturnType<C["replyWithAnimation"]>;
  replyWithVoice: (
    voice: Parameters<C["replyWithVoice"]>[0],
    other?: ExtendOptions<Parameters<C["replyWithVoice"]>[1]>,
    signal?: Parameters<C["replyWithVoice"]>[2],
  ) => ReturnType<C["replyWithVoice"]>;
  replyWithVideoNote: (
    video_note: Parameters<C["replyWithVideoNote"]>[0],
    other?: ExtendOptions<Parameters<C["replyWithVideoNote"]>[1]>,
    signal?: Parameters<C["replyWithVideoNote"]>[2],
  ) => ReturnType<C["replyWithVideoNote"]>;
  replyWithMediaGroup: (
    video_note: Parameters<C["replyWithMediaGroup"]>[0],
    other?: ExtendOptions<Parameters<C["replyWithMediaGroup"]>[1]>,
    signal?: Parameters<C["replyWithMediaGroup"]>[2],
  ) => ReturnType<C["replyWithMediaGroup"]>;
  replyWithLocation: (
    latitude: Parameters<C["replyWithLocation"]>[0],
    longitude: Parameters<C["replyWithLocation"]>[1],
    other?: ExtendOptions<Parameters<C["replyWithLocation"]>[2]>,
    signal?: Parameters<C["replyWithLocation"]>[3],
  ) => ReturnType<C["replyWithLocation"]>;
}

export type AutoremoveFlavor<C extends Context> = AutoremoveContext<C> & C;

export function autoremoveTimeout(
  storage: StorageAdapter<MessagesToRemove>,
  api: Api,
) {
  const autoremover = new Autoremover(storage, api);

  function withTimeout<
    F extends (
      // deno-lint-ignore no-explicit-any
      ...arg0: any[]
    ) => Promise<R>,
    R extends Message.ServiceMessage | Message.ServiceMessage[],
    T extends Context,
  >(original: F) {
    return async function (
      this: T,
      arg0: Parameters<F>[0],
      options?: ExtendOptions<Parameters<F>[1]>,
      signal?: Parameters<F>[2],
    ) {
      const msg = await original(arg0, options, signal);

      if (options?.timeout) {
        const msgId = Array.isArray(msg)
          ? msg.map((m) => m.message_id)
          : msg.message_id;
        const { chat } = Array.isArray(msg) ? msg[0] : msg;

        await autoremover.setMessageToAutoremove(
          chat.id,
          msgId,
          options.timeout,
        );
      }

      return msg;
    };
  }

  const interval = setInterval(() => autoremover.loop(), 1000);
  process.once("exit", () => clearInterval(interval));

  return function hydrateContext<C extends Context>(
    ctx: C,
    next: NextFunction,
  ) {
    ctx.reply = withTimeout(ctx.reply);
    ctx.replyWithPhoto = withTimeout(ctx.replyWithPhoto.bind(ctx));
    ctx.replyWithAudio = withTimeout(ctx.replyWithAudio.bind(ctx));
    ctx.replyWithDocument = withTimeout(ctx.replyWithDocument.bind(ctx));
    ctx.replyWithVideo = withTimeout(ctx.replyWithVideo.bind(ctx));
    ctx.replyWithAnimation = withTimeout(ctx.replyWithAnimation.bind(ctx));
    ctx.replyWithVoice = withTimeout(ctx.replyWithVoice.bind(ctx));
    ctx.replyWithVideoNote = withTimeout(ctx.replyWithVideoNote.bind(ctx));
    ctx.replyWithMediaGroup = withTimeout(
      ctx.replyWithMediaGroup.bind(ctx),
    );
    // ctx.replyWithLocation = withTimeout(ctx.replyWithLocation.bind(ctx));

    return next();
  };
}
