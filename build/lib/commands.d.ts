declare type Action = 'open' | 'day_lock' | 'lock' | 'open_electronic_door';
/**
 * Creates the command encoded url
 *
 * @param action action to execute
 * @param lockId id of the lock
 * @param secret api key not url encoded
 */
export declare function createCommand(action: Action, lockId: number, secret: string): string;
export {};
