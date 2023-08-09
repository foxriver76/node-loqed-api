/// <reference types="node" />
import EventEmitter from 'node:events';
type LOQEDGoToEventType = 'GO_TO_STATE_MANUAL_LOCK_REMOTE_NIGHT_LOCK' | 'GO_TO_STATE_MANUAL_UNLOCK_REMOTE_OPEN' | 'GO_TO_STATE_MANUAL_LOCK_REMOTE_LATCH' | 'GO_TO_STATE_INSTANTOPEN_OPEN' | 'GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_PIN' | 'GO_TO_STATE_MANUAL_UNLOCK_BLE_OPEN' | 'GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_BUTTON' | 'GO_TO_STATE_TWIST_ASSIST_LATCH';
type LOQEDEventType = LOQEDGoToEventType | 'STATE_CHANGED_OPEN' | 'STATE_CHANGED_LATCH' | 'STATE_CHANGED_NIGHT_LOCK' | 'MOTOR_STALL';
type LOQEDGoToState = 'OPEN' | 'DAY_LOCK' | 'NIGHT_LOCK';
type LOQEDRequestedState = LOQEDGoToState | 'UNKNOWN';
interface LOQEDBaseEvent {
    mac_wifi: string;
    mac_ble: string;
    event_type?: LOQEDEventType;
    /** key used to open the lock */
    key_local_id: number;
    /** Exists on STATE_CHANGED_XY */
    requested_state?: LOQEDRequestedState;
    /** Exists on STATE_CHANGED_XY */
    requested_state_numeric?: number;
    /** EXISTS on GO_TO_STATE_XY */
    go_to_state?: LOQEDGoToState;
    /** no eventType for the following two */
    battery_percentage?: number;
    battery_type?: string;
    /** following two separate event without eventType */
    wifi_strength?: number;
    ble_strength?: number;
}
interface LOQEDGoToEvent extends LOQEDBaseEvent {
    go_to_state: LOQEDGoToState;
    event_type: LOQEDGoToEventType;
    requested_state: undefined;
}
interface LOQEDStateChangedEvent extends LOQEDBaseEvent {
    go_to_state: undefined;
    event_type: Exclude<LOQEDEventType, LOQEDGoToEventType>;
    requested_state: LOQEDRequestedState;
}
interface LOQEDOtherEvent extends LOQEDBaseEvent {
    go_to_state: undefined;
    event_type: undefined;
    requested_state: undefined;
}
type LOQEDEvent = LOQEDGoToEvent | LOQEDStateChangedEvent | LOQEDOtherEvent;
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
type LOQEDBinary = 0 | 1;
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
interface LOQEDApiBaseEvent {
    /** Value of the event */
    val: unknown;
}
export interface LOQEDApiGoToEvent extends LOQEDApiBaseEvent {
    /** target lock state */
    val: LOQEDGoToState;
    /** key used to open the lock */
    localKeyId: number;
}
export interface LOQEDApiStateChangedEvent extends LOQEDApiBaseEvent {
    /** current lock state */
    val: LOQEDRequestedState;
}
export interface LOQEDApiBatteryEvent extends LOQEDApiBaseEvent {
    /** Current battery level in % */
    val: number;
}
export interface LOQEDApiBleStrengthEvent extends LOQEDApiBaseEvent {
    /** Current BLE signal strength */
    val: number;
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
export interface LOQED {
    on(event: 'GO_TO_STATE', listener: (state: LOQEDApiGoToEvent) => void): this;
    on(event: 'STATE_CHANGED', listener: (state: LOQEDApiStateChangedEvent) => void): this;
    on(event: 'UNKNOWN_EVENT', listener: (event: LOQEDEvent) => void): this;
    on(event: 'BATTERY_LEVEL', listener: (event: LOQEDApiBatteryEvent) => void): this;
    on(event: 'BLE_STRENGTH', listener: (event: LOQEDApiBleStrengthEvent) => void): this;
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
