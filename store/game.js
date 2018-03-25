let express = require('express');
let router = express.Router();
let pool = require('../db/dbPool');
let kcp = require('node-kcp');

const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');

let matchMap = [];
let matchingMap = [];
let defaultMatch = {
    matchId: '',
    users: [],
    userIds: [],
    mapId: 1,
    statue: 0, //0未开始 1正在进行 2已结束
    createTime: '',
    startTime: '',
    endTime: '',
    botCount: 9,
    limitPeople: 10,
};
let defaultMan = {
    userId: '',
    matchId: '',
    lastTime: 0,
    xSpeed: 40,
    ySpeed: 40,
    duringTime: 0,
    walkFlag: [0, 0, 0, 0],
    position: [50, 50],
};
let matchSetting = {
};

router.get('/socket', function(req, res, next) {
  res.send(`
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.4/socket.io.js"></script>
<script>
  var socket = io('localhost:3000');
</script>
    `);
});

let kcpServer = undefined;
let clients = {};
router.setKcp = function(server) {
    let interval = 200;
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
    server.on('listening', () => {
        let address = server.address();
        setInterval(() => {
            for (let k in clients) {
                let kcpobj = clients[k];
                kcpobj.update(Date.now());
                let recv = kcpobj.recv();
                if (recv) {
                    let obj = decoder.write(recv);
                    obj = JSON.parse(obj);
                    if (obj.matchID){
                        clients[k].matchID = obj.matchID;
                        let moveUser;
                        for (let i = 0; i < matchMap.length; i++) {
                            if (matchMap[i].matchId === data.matchId) {
                                let thisMatch = matchMap[i];
                                for (let i = 0; i < thisMatch.users.length; i++){
                                    if (thisMatch.users[i].userId === data.userId){
                                        thisMatch.users[i].walkFlag = data.walkFlag;
                                        thisMatch.users[i].position = data.position;
                                        thisMatch.users[i].flag = 1;
                                        moveUser = thisMatch.users[i];
                                    }
                                }
                            }
                        }
                        if (moveUser){
                            for (let one in clients) {
                                if (one.matchId === obj.matchID &&
                                    kcpobj.context().address !== one.context().address &&
                                    kcpobj.context().port !== one.context().port){
                                    kcpobj.send(JSON.stringify(moveUser));
                                }
                            }
                        }
                    }
                }
            }
        }, interval);
    });
    kcpServer = server;
};


router.all('/getInMatch', function(req, res, next) {
    let params = req.body || req.query || req.params;
    let returnResult = {};
    let userId = params.userId;

    if (matchingMap.length === 0){
        let appendMatch = JSON.parse(JSON.stringify(defaultMatch));
        appendMatch.matchId = new Date().getTime();
        matchingMap.push(appendMatch);
    }
    let thisMatch = undefined;
    for (let i = 0; i < matchingMap.length; i++){
        if (matchingMap[i].users.length < matchingMap[i].limitPeople){
            thisMatch = matchingMap[i];
            let appendMan = JSON.parse(JSON.stringify(defaultMan));
            appendMan.userId = userId;
            appendMan.matchId = thisMatch.matchId;
            thisMatch.users.push(appendMan);
            thisMatch.userIds.push(userId);
            if (thisMatch.users.length + thisMatch.botCount >= thisMatch.limitPeople){
                for (let i = 0; i < thisMatch.botCount; i++){
                    let appendMan = JSON.parse(JSON.stringify(defaultMan));
                    appendMan.userId = i;
                    appendMan.position[0] = i * 50;
                    appendMan.position[1] = i * 50;
                    thisMatch.users.push(appendMan);
                }
                thisMatch.statue = 1;
                thisMatch = matchingMap.splice(i, 1)[0];
                matchMap.push(thisMatch);
                setTimeout(function () {
                    setInterval(function () {
                        for (let i = 0; i < thisMatch.users.length; i++){
                            let curTime = new Date().getTime();
                            if (thisMatch.userIds.indexOf(thisMatch.users[i].userId) === -1){
                                let moveX = (thisMatch.users[i].walkFlag[3] - thisMatch.users[i].walkFlag[2]) * thisMatch.users[i].xSpeed * thisMatch.users[i].duringTime / 1000;
                                let moveY = (thisMatch.users[i].walkFlag[0] - thisMatch.users[i].walkFlag[1]) * thisMatch.users[i].ySpeed * thisMatch.users[i].duringTime / 1000;
                                if (Math.random() > 0.3){
                                    thisMatch.users[i].walkFlag = [
                                        Math.random() > 0.5 ? 1 : 0,
                                        Math.random() > 0.5 ? 1 : 0,
                                        Math.random() > 0.5 ? 1 : 0,
                                        Math.random() > 0.5 ? 1 : 0];
                                }
                                thisMatch.users[i].lastTime = curTime;
                                // thisMatch.users[i].duringTime = 5 *  Math.random() * 1000;
                                thisMatch.users[i].duringTime = 2000;
                                thisMatch.users[i].position[0] += moveX;
                                thisMatch.users[i].position[1] += moveY;
                                // socket.emit(thisMatch.matchId, thisMatch.users[i]);

                                if (thisMatch.users[i]){
                                    for (let one in clients) {
                                        if (one.matchId === thisMatch.matchId){
                                            kcpServer.send(JSON.stringify(thisMatch.users[i]));
                                        }
                                    }
                                }

                            }
                        }
                    }, 2000);
                });

            }
            break;
        }
    }
    let result = {
        users: thisMatch.users,
        matchId: thisMatch.matchId,
    };
    res.json(result)
});
router.all('/loopMatch', function(req, res, next) {

});
module.exports = router;
