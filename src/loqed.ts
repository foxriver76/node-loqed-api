import EventEmitter from 'events';
import express from 'express';
import axios from 'axios';
import * as crypto from 'crypto';

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
        this.server.get('/', (req, res) => {
            res.send('Well done!');
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
}
