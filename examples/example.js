const { LOQED } = require('./../build/loqed');

(async () => {
    const loqedClient = new LOQED({
        auth: 'tgG39ryc5lZXquBpmbZo9DnpGMGYUVrw414kXKofVEI=',
        apiKey: '8yBMfXdZXZTOYHL5AKrBGt62J4Rvk0DMdJJilh6jen4=',
        ip: '192.168.178.232',
        port: 9005
    });

    loqedClient.on('UNKNOWN_EVENT', data => {
        console.log(`Unknown event: ${JSON.stringify(data)}`);
    });

    loqedClient.on('GO_TO_STATE_MANUAL_UNLOCK_REMOTE_OPEN', data => {
        console.log(`Lock now tries to go to position: ${data}`);
    });

    loqedClient.on('STATE_CHANGED_LATCH', data => {
        console.log(`Lock latched: ${data}`);
    });

    loqedClient.on('STATE_CHANGED_OPEN', data => {
        console.log(`Lock opened: ${data}`);
    });

    const status = await loqedClient.getStatus();
    console.log(`Battery level: ${status.battery_percentage} %`);
    console.log(`Lock state: ${status.bolt_state}`);
})();
