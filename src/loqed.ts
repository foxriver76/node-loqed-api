import EventEmitter from 'events';
import express from 'express';
import axios from 'axios';
import * as crypto from 'crypto';
import { DEFAULT_PORT, ERROR_NO_LOCK_ID } from './lib/constants';
import { createCommand } from './lib/commands';

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

interface WebhookHeader {
    HASH: string;
    TIMESTAMP: number;
}

export class LOQED extends EventEmitter {
    private readonly ip: string;
    private server: express.Express;
    private readonly port: number;
    private readonly authToken: string;
    private readonly apiKey: string;
    private readonly lockId: number;

    constructor(options: LOQEDOptions) {
        super();

        if (!options.ip) {
            throw new Error('No IP address provided');
        }

        if (!options.authToken) {
            throw new Error('No auth information provided');
        }

        if (!options.apiKey) {
            throw new Error('No API key provided');
        }

        // The lock token is provided as base64 encoded but we need it decoded
        this.authToken = Buffer.from(options.authToken, 'base64').toString();
        this.ip = options.ip;
        this.port = options.port || DEFAULT_PORT;
        this.apiKey = options.apiKey;
        this.lockId = options.lockId;

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
            throw new Error(axios.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }

    /**
     * Registers a new webhook for the ip address and port
     */
    async registerWebhook(): Promise<void> {
        // TODO
    }

    /**
     * Deletes a webhook
     */
    async deleteWebhook(): Promise<void> {
        // TODO
    }

    /**
     * Creates the webhook auth header
     * @param input the input needed in the hash in addition to timestamp and auth token
     */
    private _createWebhookHeaders(input = ''): WebhookHeader {
        const timestamp = Math.round(Date.now() / 1000);
        const bufTimestamp = Buffer.alloc(8);
        bufTimestamp.writeBigInt64BE(BigInt(timestamp));

        const hash = crypto
            .createHash('sha256')
            .update(input + bufTimestamp + this.authToken)
            .digest('hex');

        return { TIMESTAMP: timestamp, HASH: hash };
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

    async getStatus(): Promise<StatusInformation> {
        try {
            const res = await axios.get(`http://${this.ip}/status`);
            return res.data;
        } catch (e: any) {
            throw new Error(axios.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }

    /**
     * Finds bridges in network via MDNS
     */
    static async findBridges(): Promise<void> {
        // TODO
    }
}
