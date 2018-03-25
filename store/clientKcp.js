let kcp = require('node-kcp');
let kcpobj = new kcp.KCP(123, {address: '127.0.0.1', port: 41234});
let dgram = require('dgram');
let client = dgram.createSocket('udp4');
let msg = 'hello world';
let idx = 1;
let interval = 200;

kcpobj.nodelay(0, interval, 0, 0);
kcpobj.output((data, size, context) => {
    client.send(data, 0, size, context.port, context.address);
});

client.on('error', (err) => {
    console.log(`client error:\n${err.stack}`);
    client.close();
});

client.on('message', (msg, rinfo) => {
    kcpobj.input(msg);
});

let sendData = {
    id:123
};
setInterval(() => {
    kcpobj.update(Date.now());
    let recv = kcpobj.recv();
    if (recv) {
        console.log(`client recv ${recv}`);
        kcpobj.send(JSON.stringify(sendData));
    }
}, interval);

kcpobj.send(JSON.stringify(sendData));
