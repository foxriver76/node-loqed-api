import EventEmitter from 'node:events';
import express from 'express';
import axios from 'axios';
import { DEFAULT_PORT, WEBHOOK_ALL_EVENTS_FLAG } from './lib/constants';
import { createCommand, generateWebhookHeader } from './lib/commands';
import { Server } from 'net';

type LOQEDGoToEventType =
    | 'GO_TO_STATE_MANUAL_LOCK_REMOTE_NIGHT_LOCK'
    | 'GO_TO_STATE_MANUAL_UNLOCK_REMOTE_OPEN'
    | 'GO_TO_STATE_MANUAL_LOCK_REMOTE_LATCH'
    | 'GO_TO_STATE_INSTANTOPEN_OPEN'
    | 'GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_PIN'
    | 'GO_TO_STATE_MANUAL_UNLOCK_BLE_OPEN'
    | 'GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_BUTTON'
    | 'GO_TO_STATE_TWIST_ASSIST_LATCH'
    | 'GO_TO_STATE_MANUAL_LOCK_BLE_NIGHT_LOCK'
    | 'GO_TO_STATE_TWIST_ASSIST_LOCK';

type LOQEDEventType =
    | LOQEDGoToEventType
    | 'STATE_CHANGED_OPEN'
    | 'STATE_CHANGED_LATCH'
    | 'STATE_CHANGED_NIGHT_LOCK'
    | 'MOTOR_STALL';

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

type LOQEDWebhook = Omit<LOQEDRegisterdWebhook, 'id'>;

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

export class LOQED extends EventEmitter {
    private readonly ip: string;
    private server: Server | undefined;
    private readonly port: number;
    private readonly bridgeKey: string;
    private readonly apiKey: string;
    private readonly lockId: number;

    constructor(options: LOQEDOptions) {
        super();

        if (!options.ip) {
            throw new Error('No IP address provided');
        }

        if (!options.bridgeKey) {
            throw new Error('No auth information provided');
        }

        if (!options.apiKey) {
            throw new Error('No API key provided');
        }

        this.bridgeKey = options.bridgeKey;
        this.ip = options.ip;
        this.port = options.port || DEFAULT_PORT;
        this.apiKey = options.apiKey;
        this.lockId = options.lockId;

        this._startServer();
    }

    /**
     * Starts the express server for ingoing webhooks
     */
    private _startServer(): void {
        const app = express();

        app.use(express.json());

        app.post('/', req => {
            const data: LOQEDEvent = req.body;

            if (data.event_type !== undefined) {
                switch (data.event_type) {
                    case 'GO_TO_STATE_MANUAL_LOCK_REMOTE_NIGHT_LOCK':
                    case 'GO_TO_STATE_MANUAL_UNLOCK_REMOTE_OPEN':
                    case 'GO_TO_STATE_MANUAL_LOCK_REMOTE_LATCH':
                    case 'GO_TO_STATE_INSTANTOPEN_OPEN':
                    case 'GO_TO_STATE_MANUAL_UNLOCK_BLE_OPEN':
                    case 'GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_BUTTON':
                    case 'GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_PIN':
                    case 'GO_TO_STATE_TWIST_ASSIST_LATCH':
                    case 'GO_TO_STATE_TWIST_ASSIST_LOCK':
                    case 'GO_TO_STATE_MANUAL_LOCK_BLE_NIGHT_LOCK':
                        this.emit('GO_TO_STATE', {
                            val: data.go_to_state,
                            localKeyId: data.key_local_id
                        } satisfies LOQEDApiGoToEvent);
                        return;
                    case 'STATE_CHANGED_LATCH':
                    case 'STATE_CHANGED_OPEN':
                    case 'STATE_CHANGED_NIGHT_LOCK':
                    case 'MOTOR_STALL':
                        this.emit('STATE_CHANGED', { val: data.requested_state } satisfies LOQEDApiStateChangedEvent);
                        return;
                    default:
                        this.emit('UNKNOWN_EVENT', data);
                        return;
                }
            }

            if (data.battery_percentage !== undefined) {
                this.emit('BATTERY_LEVEL', { val: data.battery_percentage } satisfies LOQEDApiBatteryEvent);
                return;
            }

            if (data.ble_strength !== undefined) {
                this.emit('BLE_STRENGTH', { val: data.ble_strength } satisfies LOQEDApiBleStrengthEvent);
                return;
            }

            this.emit('UNKNOWN_EVENT', data);
        });

        this.server = app.listen(this.port);
    }

    /**
     * Stops the server process
     */
    stopServer(): Promise<void> {
        return new Promise(resolve => {
            if (!this.server) {
                return resolve();
            }

            this.server.close(() => {
                resolve();
            });
        });
    }

    /**
     * List existing webhooks
     */
    async listWebhooks(): Promise<LOQEDRegisterdWebhook[]> {
        try {
            const res = await axios.get(`http://${this.ip}/webhooks`, {
                // @ts-expect-error it seems to be correct
                headers: generateWebhookHeader(this.bridgeKey, Buffer.alloc(0))
            });
            return res.data;
        } catch (e: any) {
            throw new Error(axios.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }

    /**
     * Registers a new webhook for the ip address and port
     *
     * @param callbackUrl url to register webhook
     */
    async registerWebhook(callbackUrl: string): Promise<void> {
        const postData: LOQEDWebhook = {
            url: callbackUrl,
            trigger_state_changed_open: 1,
            trigger_state_changed_latch: 1,
            trigger_state_changed_night_lock: 1,
            trigger_state_changed_unknown: 1,
            trigger_state_goto_open: 1,
            trigger_state_goto_latch: 1,
            trigger_state_goto_night_lock: 1,
            trigger_battery: 1,
            trigger_online_status: 1
        };

        try {
            const flagBin = Buffer.alloc(4, 0);
            flagBin.writeInt32BE(WEBHOOK_ALL_EVENTS_FLAG);

            await axios.post(`http://${this.ip}/webhooks`, postData, {
                headers: {
                    'Content-Type': 'application/json',
                    ...generateWebhookHeader(this.bridgeKey, Buffer.concat([Buffer.from(callbackUrl, 'utf8'), flagBin]))
                }
            });
        } catch (e: any) {
            throw new Error(axios.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }

    /**
     * Deletes a webhook
     *
     * @param webhookId id of the webhook which will be deleted
     */
    async deleteWebhook(webhookId: number): Promise<void> {
        try {
            const webhookIdBin = Buffer.alloc(8, 0);
            webhookIdBin.writeUint32BE(webhookId, 4);

            await axios.delete(`http://${this.ip}/webhooks/${webhookId}`, {
                // @ts-expect-error it seems to be correct
                headers: generateWebhookHeader(this.bridgeKey, webhookIdBin)
            });
        } catch (e: any) {
            throw new Error(axios.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }

    /**
     * Opens the lock via API request
     */
    async openLock(): Promise<void> {
        const signedCommand = createCommand('open', this.lockId, this.apiKey);

        try {
            await axios.get(`http://${this.ip}/to_lock?command_signed_base64=${signedCommand}`);
        } catch (e: any) {
            throw new Error(axios.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }

    /**
     * Puts lock in DAY_LOCK position
     */
    async latchLock(): Promise<void> {
        const signedCommand = createCommand('day_lock', this.lockId, this.apiKey);

        try {
            await axios.get(`http://${this.ip}/to_lock?command_signed_base64=${signedCommand}`);
        } catch (e: any) {
            throw new Error(axios.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }

    /**
     * Locks the lock
     */
    async lockLock(): Promise<void> {
        const signedCommand = createCommand('lock', this.lockId, this.apiKey);

        try {
            await axios.get(`http://${this.ip}/to_lock?command_signed_base64=${signedCommand}`);
        } catch (e: any) {
            throw new Error(axios.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }

    async getStatus(): Promise<LOQEDStatusInformation> {
        try {
            const res = await axios.get(`http://${this.ip}/status`);
            return res.data;
        } catch (e: any) {
            throw new Error(axios.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }
}
