/// <reference types="node" />
import EventEmitter from 'events';
interface LOQEDOptions {
    /** IP address of the bridge */
    ip: string;
    /** Port where the server will listen on, default is 9005 */
    port?: number;
    /** Auth token of the bridge, can be found at https://app.loqed.com/API-Config */
    auth: string;
    /** API key of the registered API */
    apiKey: string;
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
    private readonly auth;
    private apiKey;
    constructor(options: LOQEDOptions);
    /**
     * Starts the express server for ingoing webhooks
     */
    private _startServer;
    /**
     * Register a new webhook
     */
    listWebhooks(): Promise<any>;
    /**
     * Creates the webhook auth header
     * @param input the input needed in the hash in addition to timestamp and auth token
     */
    private _createWebhookHeaders;
    /**
     * Opens the lock via API request
     */
    openLock(): Promise<void>;
    getStatus(): Promise<StatusInformation>;
}
export {};
