/// <reference types="node" />
import EventEmitter from 'events';
interface LOQEDOptions {
    /** IP address of the bridge */
    ip: string;
    /** Port where the server will listen on, default is 9005 */
    port?: number;
    /** Key token of the bridge, to manage webhooks */
    bridgeKey: string;
    /** API key to control lock*/
    apiKey: string;
    /** id of the lock */
    lockId: number;
}
declare type LOQEDBinary = 0 | 1;
interface LOQEDRegisterdWebhook {
    id: number;
    url: string;
    trigger_state_changed_open: LOQEDBinary;
    trigger_state_changed_latch: LOQEDBinary;
    trigger_state_changed_night_lock: LOQEDBinary;
    trigger_state_changed_unknown: LOQEDBinary;
    trigger_state_goto_open: LOQEDBinary;
    trigger_state_goto_latch: LOQEDBinary;
    trigger_state_goto_night_lock: LOQEDBinary;
    trigger_battery: LOQEDBinary;
    trigger_online_status: LOQEDBinary;
}
export interface LOQEDStatusInformation {
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
    private readonly bridgeKey;
    private readonly apiKey;
    private readonly lockId;
    constructor(options: LOQEDOptions);
    /**
     * Starts the express server for ingoing webhooks
     */
    private _startServer;
    /**
     * Stops the server process
     */
    stopServer(): Promise<void>;
    /**
     * List existing webhooks
     */
    listWebhooks(): Promise<LOQEDRegisterdWebhook[]>;
    /**
     * Registers a new webhook for the ip address and port
     *
     * @param callbackUrl url to register webhook
     */
    registerWebhook(callbackUrl: string): Promise<void>;
    /**
     * Deletes a webhook
     *
     * @param webhookId id of the webhook which will be deleted
     */
    deleteWebhook(webhookId: number): Promise<void>;
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
    getStatus(): Promise<LOQEDStatusInformation>;
}
export {};
