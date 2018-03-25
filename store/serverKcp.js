let kcp = require('node-kcp');
let dgram = require('dgram');
let server = dgram.createSocket('udp4');
let clients = {};
let interval = 200;

const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');



let output = function(data, size, context) {
    server.send(data, 0, size, context.port, context.address);
};
server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});
server.on('message', (msg, rinfo) => {
    let k = rinfo.address+'_'+rinfo.port;
    if (undefined === clients[k]) {
        let context = {
            address : rinfo.address,
            port : rinfo.port
        };
        let kcpobj = new kcp.KCP(123, context);
        kcpobj.nodelay(0, interval, 0, 0);
        kcpobj.output(output);
        clients[k] = kcpobj;
    }
    let kcpobj = clients[k];
    kcpobj.input(msg);
});

let sendData = {
    id:123
};
server.on('listening', () => {
    let address = server.address();
    console.log(`server listening ${address.address} : ${address.port}`);
    setInterval(() => {
        for (let k in clients) {
            let kcpobj = clients[k];
            kcpobj.update(Date.now());
            let recv = kcpobj.recv();
            if (recv) {
                const str = decoder.write(recv);
                console.log(str);
                kcpobj.send(str);
            }
        }
    }, interval);
});
server.bind(41234);


// console.log(`server recv ${recv} from ${kcpobj.context().address}:${kcpobj.context().port}`);