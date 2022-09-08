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
const constants_1 = require("./lib/constants");
const commands_1 = require("./lib/commands");
class LOQED extends events_1.default {
    constructor(options) {
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
        this.port = options.port || constants_1.DEFAULT_PORT;
        this.apiKey = options.apiKey;
        this.lockId = options.lockId;
        this.server = (0, express_1.default)();
        this._startServer();
    }
    /**
     * Starts the express server for ingoing webhooks
     */
    _startServer() {
        this.server.use(express_1.default.json());
        this.server.post('/', req => {
            const data = req.body;
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
    async listWebhooks() {
        try {
            const res = await axios_1.default.get(`http://${this.ip}/webhooks`, {
                // @ts-expect-error it seems to be correct
                headers: this._createWebhookHeaders()
            });
            return res.data;
        }
        catch (e) {
            throw new Error(axios_1.default.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }
    /**
     * Registers a new webhook for the ip address and port
     */
    async registerWebhook() {
        // TODO
    }
    /**
     * Deletes a webhook
     */
    async deleteWebhook() {
        // TODO
    }
    /**
     * Creates the webhook auth header
     * @param input the input needed in the hash in addition to timestamp and auth token
     */
    _createWebhookHeaders(input = '') {
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
    async openLock() {
        const signedCommand = (0, commands_1.createCommand)('open', this.lockId, this.apiKey);
        try {
            await axios_1.default.get(`http://${this.ip}/to_lock?command_signed_base64=${signedCommand}`);
        }
        catch (e) {
            throw new Error(axios_1.default.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }
    /**
     * Puts lock in DAY_LOCK position
     */
    async latchLock() {
        const signedCommand = (0, commands_1.createCommand)('day_lock', this.lockId, this.apiKey);
        try {
            await axios_1.default.get(`http://${this.ip}/to_lock?command_signed_base64=${signedCommand}`);
        }
        catch (e) {
            throw new Error(axios_1.default.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }
    /**
     * Locks the lock
     */
    async lockLock() {
        const signedCommand = (0, commands_1.createCommand)('lock', this.lockId, this.apiKey);
        try {
            await axios_1.default.get(`http://${this.ip}/to_lock?command_signed_base64=${signedCommand}`);
        }
        catch (e) {
            throw new Error(axios_1.default.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }
    async getStatus() {
        try {
            const res = await axios_1.default.get(`http://${this.ip}/status`);
            return res.data;
        }
        catch (e) {
            throw new Error(axios_1.default.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }
    /**
     * Finds bridges in network via MDNS
     */
    static async findBridges() {
        // TODO
    }
}
exports.LOQED = LOQED;
//# sourceMappingURL=loqed.js.map