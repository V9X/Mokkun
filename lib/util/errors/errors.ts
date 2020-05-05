import { TextChannel } from 'discord.js';

export class LoggedError extends Error {
    public channel?: TextChannel;

    constructor(channel?: TextChannel, message?: string) { 
        super(message);
        this.channel = channel;
    }
}

export class SilentError extends Error {
    constructor(msg?: string) {
        super(msg);
    }
}