const { LOQED } = require('./../build/loqed');

(async () => {
    const loqedClient = new LOQED({
        auth: 'tgG39ryc5lZXquBpmbZo9DnpGMGYUVrw414kXKofVEI=',
        apiKey: '8yBMfXdZXZTOYHL5AKrBGt62J4Rvk0DMdJJilh6jen4=',
        ip: '192.168.178.232',
        port: 9005
    });

    const res = await loqedClient.listWebhooks();
    console.log('ll');
    console.log(res);
})();
