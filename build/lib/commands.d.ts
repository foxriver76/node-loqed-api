export declare type Action = 'open' | 'day_lock' | 'lock' | 'open_electronic_door';
export interface WebhookHeader {
    HASH: string;
    TIMESTAMP: string;
}
/**
 * Creates the command encoded url
 *
 * @param action action to execute
 * @param lockId id of the lock
 * @param secret api key not url encoded
 */
export declare function createCommand(action: Action, lockId: number, secret: string): string;
/**
 * Creates the webhook auth header
 * @param secret the auth token of the Bridge
 * @param input the input needed in the hash in addition to timestamp and auth token
 */
export declare function generateWebhookHeader(secret: string, input?: string): WebhookHeader;
