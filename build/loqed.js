"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOQED = void 0;
const node_events_1 = __importDefault(require("node:events"));
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("./lib/constants");
const commands_1 = require("./lib/commands");
class LOQED extends node_events_1.default {
    constructor(options) {
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
        this.port = options.port || constants_1.DEFAULT_PORT;
        this.apiKey = options.apiKey;
        this.lockId = options.lockId;
        this._startServer();
    }
    /**
     * Starts the express server for ingoing webhooks
     */
    _startServer() {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.post('/', req => {
            const data = req.body;
            if ('event_type' in data) {
                switch (data.event_type) {
                    case 'GO_TO_STATE_MANUAL_LOCK_REMOTE_NIGHT_LOCK':
                    case 'GO_TO_STATE_MANUAL_UNLOCK_REMOTE_OPEN':
                    case 'GO_TO_STATE_MANUAL_LOCK_REMOTE_LATCH':
                    case 'GO_TO_STATE_INSTANTOPEN_OPEN':
                    case 'GO_TO_STATE_MANUAL_UNLOCK_BLE_OPEN':
                    case 'GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_BUTTON':
                    case 'GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_PIN':
                        this.emit('GO_TO_STATE', data.go_to_state);
                        return;
                    case 'STATE_CHANGED_LATCH':
                    case 'STATE_CHANGED_OPEN':
                    case 'STATE_CHANGED_NIGHT_LOCK':
                    case 'MOTOR_STALL':
                        this.emit('STATE_CHANGED', data.requested_state);
                        return;
                    default:
                        this.emit('UNKNOWN_EVENT', data);
                        return;
                }
            }
            if ('battery_percentage' in data) {
                this.emit('BATTERY_LEVEL', data.battery_percentage);
                return;
            }
            if ('ble_strength' in data) {
                this.emit('BLE_STRENGTH', data.ble_strength);
                return;
            }
            this.emit('UNKNOWN_EVENT', data);
        });
        this.server = app.listen(this.port);
    }
    /**
     * Stops the server process
     */
    stopServer() {
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
    async listWebhooks() {
        try {
            const res = await axios_1.default.get(`http://${this.ip}/webhooks`, {
                // @ts-expect-error it seems to be correct
                headers: (0, commands_1.generateWebhookHeader)(this.bridgeKey, Buffer.alloc(0))
            });
            return res.data;
        }
        catch (e) {
            throw new Error(axios_1.default.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }
    /**
     * Registers a new webhook for the ip address and port
     *
     * @param callbackUrl url to register webhook
     */
    async registerWebhook(callbackUrl) {
        const postData = {
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
            flagBin.writeInt32BE(constants_1.WEBHOOK_ALL_EVENTS_FLAG);
            await axios_1.default.post(`http://${this.ip}/webhooks`, postData, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(0, commands_1.generateWebhookHeader)(this.bridgeKey, Buffer.concat([Buffer.from(callbackUrl, 'utf8'), flagBin]))
                }
            });
        }
        catch (e) {
            throw new Error(axios_1.default.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
    }
    /**
     * Deletes a webhook
     *
     * @param webhookId id of the webhook which will be deleted
     */
    async deleteWebhook(webhookId) {
        try {
            const webhookIdBin = Buffer.alloc(8, 0);
            webhookIdBin.writeUint32BE(webhookId, 4);
            await axios_1.default.delete(`http://${this.ip}/webhooks/${webhookId}`, {
                // @ts-expect-error it seems to be correct
                headers: (0, commands_1.generateWebhookHeader)(this.bridgeKey, webhookIdBin)
            });
        }
        catch (e) {
            throw new Error(axios_1.default.isAxiosError(e) && e.response ? e.response.data : e.message);
        }
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
}
exports.LOQED = LOQED;
//# sourceMappingURL=loqed.js.map