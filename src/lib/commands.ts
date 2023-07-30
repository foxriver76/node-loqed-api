import crypto from 'node:crypto';

export type LOQEDAction = 'open' | 'day_lock' | 'lock' | 'open_electronic_door';

export interface LOQEDWebhookHeader {
    HASH: string;
    TIMESTAMP: string;
}

enum Actions {
    OPEN = 1,
    DAY_LOCK = 2,
    LOCK = 3
}

enum CommandTypes {
    NORMAL = 7,
    SPECIAL = 89
}

/**
 * Creates the command encoded url
 *
 * @param action action to execute
 * @param lockId id of the lock
 * @param secret api key not url encoded
 */
export function createCommand(action: LOQEDAction, lockId: number, secret: string): string {
    let base64command = null;
    switch (action) {
        case 'open':
            base64command = makeCommand(lockId, CommandTypes.NORMAL, Actions.OPEN, secret);
            break;
        case 'day_lock':
            base64command = makeCommand(lockId, CommandTypes.NORMAL, Actions.DAY_LOCK, secret);
            break;
        case 'lock':
            base64command = makeCommand(lockId, CommandTypes.NORMAL, Actions.LOCK, secret);
            break;
        case 'open_electronic_door':
            base64command = makeCommand(lockId, CommandTypes.SPECIAL, Actions.OPEN, secret);
            break;
        default:
            throw new Error('Error no valid action');
    }

    if (!base64command) {
        throw new Error('No valid command');
    }

    return encodeURIComponent(base64command);
}

/**
 * Prepare a command to send to the LOQED api
 *
 * @param lockId id of the lock
 * @param commandType id of the command
 * @param action id of the action
 * @param secret api key not url encoded
 */
function makeCommand(lockId: number, commandType: CommandTypes, action: Actions, secret: string): string {
    const messageId = 0;

    const messageIdBin = Buffer.alloc(8, 0);
    messageIdBin.writeUint32BE(messageId, 4);

    const protocol = 2;
    const deviceId = 1;
    const timestamp = Math.floor(Date.now() / 1000);

    const secretBin = Buffer.from(secret, 'base64').slice(0, 32);
    const timeNowBin = Buffer.alloc(8, 0);
    timeNowBin.writeUint32BE(timestamp, 4);

    const localGeneratedBinaryHash = Buffer.concat([
        Buffer.from([protocol]),
        Buffer.from([commandType]),
        timeNowBin,
        Buffer.from([lockId]),
        Buffer.from([deviceId]),
        Buffer.from([action])
    ]);

    const encryptedBinaryHash = crypto.createHmac('sha256', secretBin).update(localGeneratedBinaryHash).digest();

    let command: Buffer;
    switch (commandType) {
        case CommandTypes.NORMAL:
            command = Buffer.concat([
                messageIdBin,
                Buffer.from([protocol]),
                Buffer.from([commandType]),
                timeNowBin,
                encryptedBinaryHash,
                Buffer.from([lockId]),
                Buffer.from([deviceId]),
                Buffer.from([action])
            ]);
            break;
        case CommandTypes.SPECIAL:
            command = Buffer.concat([
                messageIdBin,
                Buffer.from([protocol]),
                Buffer.from([commandType]),
                Buffer.from([action])
            ]);
            break;
        default:
            throw new Error('Unknown command type');
    }

    if (!command) {
        throw new Error('No valid command');
    }

    return command.toString('base64');
}

/**
 * Creates the webhook auth header
 *
 * @param secret the auth token of the Bridge
 * @param input the input needed in the hash in addition to timestamp and auth token
 */
export function generateWebhookHeader(secret: string, input: Buffer): LOQEDWebhookHeader {
    const timestamp = Math.round(Date.now() / 1000);

    const secretBin = Buffer.from(secret, 'base64').slice(0, 32);
    const timeNowBin = Buffer.alloc(8, 0);
    timeNowBin.writeUint32BE(timestamp, 4);

    const localGeneratedBinaryHash = Buffer.concat([input, timeNowBin, secretBin]);

    const hash = crypto.createHash('sha256').update(localGeneratedBinaryHash).digest('hex');

    return { TIMESTAMP: timestamp.toString(), HASH: hash };
}
