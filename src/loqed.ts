import EventEmitter from 'events';
import express from 'express';
import axios from 'axios';
import { DEFAULT_PORT, WEBHOOK_ALL_EVENTS_FLAG } from './lib/constants';
import { createCommand, generateWebhookHeader } from './lib/commands';
import * as CryptoJS from 'crypto-js';
import { Server } from 'net';

type LOQEDEventType =
    | 'STATE_CHANGED_OPEN'
    | 'STATE_CHANGED_LATCH'
    | 'STATE_CHANGED_NIGHT_LOCK'
    | 'MOTOR_STALL'
    | 'GO_TO_STATE_MANUAL_LOCK_REMOTE_NIGHT_LOCK'
    | 'GO_TO_STATE_MANUAL_UNLOCK_REMOTE_OPEN'
    | 'GO_TO_STATE_MANUAL_LOCK_REMOTE_LATCH';

interface LOQEDEvent {
    mac_wifi: string;
    mac_ble: string;
    event_type: LOQEDEventType;
    key_local_id: number;
    /** Exists on STATE_CHANGED_XY */
    requested_state?: string;
    /** Exists on STATE_CHANGED_XY */
    requested_state_numeric?: number;
    /** EXISTS on GO_TO_STATE_XY */
    go_to_state?: string;
}

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

            switch (data.event_type) {
                case 'GO_TO_STATE_MANUAL_LOCK_REMOTE_NIGHT_LOCK':
                case 'GO_TO_STATE_MANUAL_UNLOCK_REMOTE_OPEN':
                case 'GO_TO_STATE_MANUAL_LOCK_REMOTE_LATCH':
                    this.emit('GO_TO_STATE', data.go_to_state);
                    break;
                case 'STATE_CHANGED_LATCH':
                case 'STATE_CHANGED_OPEN':
                case 'STATE_CHANGED_NIGHT_LOCK':
                case 'MOTOR_STALL':
                    this.emit('STATE_CHANGED', data.requested_state);
                    break;
                default:
                    this.emit('UNKNOWN_EVENT', data);
            }
        });

        this.server = app.listen(this.port, () => {
            console.log(`The application is listening on port ${this.port}!`);
        });
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
                headers: generateWebhookHeader(this.bridgeKey, CryptoJS.lib.WordArray.create())
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
            await axios.post(`http://${this.ip}/webhooks`, postData, {
                headers: {
                    'Content-Type': 'application/json',
                    ...generateWebhookHeader(
                        this.bridgeKey,
                        CryptoJS.enc.Utf8.parse(callbackUrl).concat(
                            CryptoJS.lib.WordArray.create([0, WEBHOOK_ALL_EVENTS_FLAG])
                        )
                    )
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
            await axios.delete(`http://${this.ip}/webhooks/${webhookId}`, {
                // @ts-expect-error it seems to be correct
                headers: generateWebhookHeader(this.bridgeKey, CryptoJS.lib.WordArray.create([0, webhookId]))
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
