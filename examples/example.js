const { LOQED } = require('./../build/loqed');

(async () => {
    const loqedClient = new LOQED({
        authToken: 'tgG39ryc5lZXquBpmbZo9DnpGMGYUVrw414kXKofVEI=',
        apiKey: '8yBMfXdZXZTOYHL5AKrBGt62J4Rvk0DMdJJilh6jen4=',
        ip: '192.168.178.232',
        port: 9005,
        lockId: 2
    });

    try {
        await loqedClient.listWebhooks();
    } catch (e) {
        console.error(`Cannot list webhooks: ${e.message}`);
    }

    loqedClient.on('UNKNOWN_EVENT', event => {
        console.log(`Unknown event: ${JSON.stringify(event)}`);
    });

    loqedClient.on('GO_TO_STATE', state => {
        console.log(`Lock now tries to go to position: ${state}`);
    });

    loqedClient.on('STATE_CHANGED', state => {
        console.log(`Lock state changed: ${state}`);
    });

    const status = await loqedClient.getStatus();
    console.log(`Battery level: ${status.battery_percentage} %`);
    console.log(`Lock state: ${status.bolt_state}`);

    try {
        // await loqedClient.openLock();
        // await loqedClient.latchLock();
        // await loqedClient.lockLock();
    } catch (e) {
        console.error(`Could not control lock: ${e.message}`);
    }
})();
