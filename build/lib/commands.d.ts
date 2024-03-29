/// <reference types="node" />
export type LOQEDAction = 'open' | 'day_lock' | 'lock' | 'open_electronic_door';
export interface LOQEDWebhookHeader {
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
export declare function createCommand(action: LOQEDAction, lockId: number, secret: string): string;
/**
 * Creates the webhook auth header
 *
 * @param secret the auth token of the Bridge
 * @param input the input needed in the hash in addition to timestamp and auth token
 */
export declare function generateWebhookHeader(secret: string, input: Buffer): LOQEDWebhookHeader;
