import * as CryptoJS from 'crypto-js';

type Action = 'open' | 'day_lock' | 'lock' | 'open_electronic_door';

/**
 * Creates the command encoded url
 *
 * @param action action to execute
 * @param lockId id of the lock
 * @param secret api key not url encoded
 */
export function createCommand(action: Action, lockId: number, secret: string): string {
    let base64command = null;
    switch (action) {
        case 'open':
            base64command = makeCommand(lockId, 7, 1, secret);
            break;
        case 'day_lock':
            base64command = makeCommand(lockId, 7, 2, secret);
            break;
        case 'lock':
            base64command = makeCommand(lockId, 7, 3, secret);
            break;
        case 'open_electronic_door':
            base64command = makeCommand(lockId, 89, 2, secret);
            break;
        default:
            console.error('Error no valid action');
    }

    if (!base64command) {
        // No command, bail out function and make sure to make the interface interactive again.
        throw new Error('No valid command');
    }

    return encodeURIComponent(base64command);
}

/**
 * Prepare a command to send to the LOQED api
 */
function makeCommand(key_id: number, command_type: number, action: number, secret: string): string {
    const messageId = 0;
    const messageId_bin = CryptoJS.lib.WordArray.create([0, messageId]);

    const getBin = (value: number): CryptoJS.lib.WordArray => CryptoJS.enc.Utf8.parse(String.fromCharCode(value));
    const protocol = 2;
    const device_id = 1;
    const time = Math.floor(Date.now() / 1000);
    //const time = 1;
    const secret_bin = CryptoJS.lib.WordArray.create(CryptoJS.enc.Base64.parse(secret).words.slice(0, 8));
    const timenow_bin = CryptoJS.lib.WordArray.create([0, time]);

    const local_generated_binary_hash = getBin(protocol)
        .concat(getBin(command_type))
        .concat(timenow_bin)
        .concat(getBin(key_id))
        .concat(getBin(device_id))
        .concat(getBin(action));

    const encrypted_binary_hash = CryptoJS.HmacSHA256(local_generated_binary_hash, secret_bin);

    let command = null;
    switch (command_type) {
        case 7:
            command = messageId_bin
                .concat(getBin(protocol))
                .concat(getBin(command_type))
                .concat(timenow_bin)
                .concat(encrypted_binary_hash)
                .concat(getBin(key_id))
                .concat(getBin(device_id))
                .concat(getBin(action));
            break;
        case 89:
            command = messageId_bin.concat(getBin(protocol)).concat(getBin(command_type)).concat(getBin(action));
            break;
        default:
            console.error('Unknown command type');
    }

    if (!command) {
        throw new Error('No valid command');
    }

    return CryptoJS.enc.Base64.stringify(command);
}
