/// <reference types="node" />
import EventEmitter from 'events';
interface LOQEDOptions {
    /** IP address of the bridge */
    ip: string;
    /** Port where the server will listen on, default is 9005 */
    port?: number;
    /** Auth token of the bridge, to manage webhooks */
    authToken: string;
    /** API key to control lock*/
    apiKey: string;
    /** id of the lock */
    lockId: number;
}
export interface StatusInformation {
    battery_percentage: number;
    battery_type: string;
    battery_type_numeric: number;
    battery_voltage: number;
    bolt_state: string;
    bolt_state_numeric: number;
    bridge_mac_wifi: string;
    bridge_mac_ble: string;
    lock_online: number;
    webhooks_number: number;
    ip_address: string;
    up_timestamp: number;
    wifi_strength: number;
    ble_strength: number;
}
export declare class LOQED extends EventEmitter {
    private readonly ip;
    private server;
    private readonly port;
    private readonly authToken;
    private readonly apiKey;
    private readonly lockId;
    constructor(options: LOQEDOptions);
    /**
     * Starts the express server for ingoing webhooks
     */
    private _startServer;
    /**
     * List existing webhooks
     */
    listWebhooks(): Promise<any>;
    /**
     * Registers a new webhook for the ip address and port
     */
    registerWebhook(): Promise<void>;
    /**
     * Deletes a webhook
     *
     * @param webhookId id of the webhook which will be deleted
     */
    deleteWebhook(webhookId: string): Promise<void>;
    /**
     * Opens the lock via API request
     */
    openLock(): Promise<void>;
    /**
     * Puts lock in DAY_LOCK position
     */
    latchLock(): Promise<void>;
    /**
     * Locks the lock
     */
    lockLock(): Promise<void>;
    getStatus(): Promise<StatusInformation>;
}
export {};
