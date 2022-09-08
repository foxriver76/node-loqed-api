"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOQED = void 0;
const events_1 = __importDefault(require("events"));
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const DEFAULT_PORT = 9005;
class LOQED extends events_1.default {
    constructor(options) {
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
        this.server = (0, express_1.default)();
        this._startServer();
    }
    /**
     * Starts the express server for ingoing webhooks
     */
    _startServer() {
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
    async listWebhooks() {
        try {
            const res = await axios_1.default.get(`http://${this.ip}/webhooks`, {
                // @ts-expect-error it seems to be correct
                headers: this._createWebhookHeaders()
            });
            return res.data;
        }
        catch (e) {
            throw new Error(`Could not list webhooks: ${axios_1.default.isAxiosError(e) && e.response ? e.response.data : e.message}`);
        }
    }
    /**
     * Creates the webhook auth header
     * @param input the input needed in the hash in addition to timestamp and auth token
     */
    _createWebhookHeaders(input = '') {
        const timestamp = Math.round(Date.now() / 1000);
        const bInt = BigInt(timestamp);
        const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
        buf.writeBigInt64LE(bInt);
        const hash = crypto
            .createHash('sha256')
            .update(input + buf + this.auth)
            .digest('hex');
        return { TIMESTAMP: timestamp, HASH: hash };
    }
}
exports.LOQED = LOQED;
//# sourceMappingURL=loqed.js.map