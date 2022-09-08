import EventEmitter from 'events';
import express from 'express';
import axios from 'axios';
import * as crypto from 'crypto';

type LOQEDEventType =
    | 'STATE_CHANGED_OPEN'
    | 'STATE_CHANGED_LATCH'
    | 'STATE_CHANGED_NIGHT_LOCK'
    | 'MOTOR_STALL'
    | 'GO_TO_STATE_MANUAL_LOCK_REMOTE_NIGHT_LOCK'
    | 'GO_TO_STATE_MANUAL_UNLOCK_REMOTE_OPEN';

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

interface WebhookHeader {
    HASH: string;
    TIMESTAMP: number;
}

const DEFAULT_PORT = 9005;

export class LOQED extends EventEmitter {
    private readonly ip: string;
    private server: express.Express;
    private readonly port: number;
    private readonly auth: string;
    private apiKey: string;

    constructor(options: LOQEDOptions) {
        super();

        if (!options.ip) {
            throw new Error('No IP address provided');
        }

        if (!options.auth) {
            throw new Error('No auth information provided');
        }

        if (!options.apiKey) {
            throw new Error('No API key provided');
        }

        // The lock token is provided as base64 encoded but we need it decoded
        this.auth = Buffer.from(options.auth, 'base64').toString();
        this.ip = options.ip;
        this.port = options.port || DEFAULT_PORT;
        this.apiKey = options.apiKey;

        this.server = express();
        this._startServer();
    }

    /**
     * Starts the express server for ingoing webhooks
     */
    private _startServer(): void {
        this.server.use(express.json());

        this.server.post('/', req => {
            const data: LOQEDEvent = req.body;

            switch (data.event_type) {
                case 'GO_TO_STATE_MANUAL_LOCK_REMOTE_NIGHT_LOCK':
                case 'GO_TO_STATE_MANUAL_UNLOCK_REMOTE_OPEN':
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

        this.server.listen(this.port, () => {
            console.log(`The application is listening on port ${this.port}!`);
        });
    }

    /**
     * Register a new webhook
     */
    async listWebhooks(): Promise<any> {
        try {
            const res = await axios.get(`http://${this.ip}/webhooks`, {
                // @ts-expect-error it seems to be correct
                headers: this._createWebhookHeaders()
            });
            return res.data;
        } catch (e: any) {
            throw new Error(
                `Could not list webhooks: ${axios.isAxiosError(e) && e.response ? e.response.data : e.message}`
            );
        }
    }

    /**
     * Creates the webhook auth header
     * @param input the input needed in the hash in addition to timestamp and auth token
     */
    private _createWebhookHeaders(input = ''): WebhookHeader {
        const timestamp = Math.round(Date.now() / 1000);

        const hash = crypto
            .createHash('sha256')
            .update(input + BigInt(timestamp) + this.auth)
            .digest('hex');

        return { TIMESTAMP: timestamp, HASH: hash };
    }

    /**
     * Opens the lock via API request
     */
    async openLock(): Promise<void> {
        // TODO
    }

    async getStatus(): Promise<StatusInformation> {
        try {
            const res = await axios.get(`http://${this.ip}/status`);
            return res.data;
        } catch (e: any) {
            throw new Error(
                `Could not get status: ${axios.isAxiosError(e) && e.response ? e.response.data : e.message}`
            );
        }
    }
}
