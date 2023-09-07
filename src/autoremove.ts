import { Api, StorageAdapter } from "./deps.deno.ts";

interface MessageToRemove {
    chatId: number;
    messageId: number;
}

export type MessagesToRemove = MessageToRemove[];

export class Autoremover {
    constructor(
        private readonly storage: StorageAdapter<MessagesToRemove>,
        private readonly api: Api,
    ) {}

    async loop() {
        const time = this.getCurrentTime();
        const key = this.getStorageKey(time);

        const value = await this.storage.read(key);
        if (!value) return;

        const promises = value.map((msg) =>
            this.api.deleteMessage(msg.chatId, msg.messageId)
        );
        await Promise.all(promises);
    }

    async setMessageToAutoremove(
        chatId: number,
        messageId: number | number[],
        timeout: number,
    ) {
        const when = this.getCurrentTime() + timeout;
        const key = this.getStorageKey(when);

        const existingValue = await this.storage.read(key);
        const messagesToRemove = this.flat(chatId, messageId);

        await this.storage.write(
            key,
            existingValue
                ? [...existingValue, ...messagesToRemove]
                : messagesToRemove,
        );
    }

    private getCurrentTime() {
        return Math.round(Date.now() / 1000);
    }

    private flat(chatId: number, messageId: number | number[]) {
        if (Array.isArray(messageId)) {
            return messageId.map((msgId) => ({ chatId, messageId: msgId }));
        }

        return [{ chatId, messageId }];
    }

    private getStorageKey(when: number): string {
        return `autoremove.${when.toString(10)}`;
    }
}
