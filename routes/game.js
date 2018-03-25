let express = require('express');
let router = express.Router();
let pool = require('../db/dbPool');

let matchMap = [];
let matchingMap = [];
let matchSetting = {
    width: 1334,
    height: 750
};
let defaultMatch = {
    matchId: '',
    users: [],
    userIds: [],
    mapId: 1,
    statue: 0, //0未开始 1正在进行 2已结束
    createTime: '',
    startTime: '',
    endTime: '',
    botCount: 30,
    limitUser: 1,
};
let defaultMan = {
    userId: '',
    lastTime: 0,
    xSpeed: 40,
    ySpeed: 40,
    duringTime: 0,
    walkFlag: [0, 0, 0, 0],
    position: [50, 50],
};

let socket = undefined;
router.setSocket = function(io) {
    socket = io;
    io.on('connection', function(each){
        let conUserId;
        let conMatchId;
        each.on('disconnect', function(){
            for (let i = 0; i < matchMap.length; i++) {
                if (matchMap[i].matchId === conMatchId) {
                    let thisMatch = matchMap[i];
                    for (let i = 0; i < thisMatch.users.length; i++){
                        if (thisMatch.users[i].userId === conUserId){
                            let user = thisMatch.users.splice(i, 1)[0];
                            // if (thisMatch.users.length === 0){
                            thisMatch.statue = 2;
                            // }
                        }
                    }
                }
            }
        });
        each.on('move', function(data){
            conUserId = data.userId;
            conMatchId = data.matchId;
            for (let i = 0; i < matchMap.length; i++) {
                if (matchMap[i].matchId === data.matchId) {
                    let thisMatch = matchMap[i];
                    for (let i = 0; i < thisMatch.users.length; i++){
                        if (thisMatch.users[i].userId === data.userId){
                            thisMatch.users[i].walkFlag = data.walkFlag;
                            thisMatch.users[i].position = data.position;
                            thisMatch.users[i].flag = 1;
                            let result = {
                                users: [thisMatch.users[i]],
                                timeStamp: new Date().getTime()
                            };
                            each.broadcast.emit(thisMatch.matchId, result);
                        }
                    }
                }
            }
        });
    });
    io.on('error', (error) => {
        console.log('a user error');
    });
};

router.all('/asyncTime', function(req, res, next) {
    let params = req.body || req.query || req.params;
    let returnResult = {};
    let result = {
        timeStamp: new Date().getTime(),
    };
    res.json(result);
});

router.all('/judgeUser', function(req, res, next) {
    let params = req.body || req.query || req.params;
    let returnResult = {};
    let userId = params.userId;
    let matchId = params.matchId;
    let judgeId = params.judgeId;
    let result = {
        judgeId: judgeId,
        timeStamp: new Date().getTime(),
    };
    result.result = 'wrong';
    if (userId === judgeId){
        res.json(result);
    }
    for (let i = 0; i < matchMap.length; i++) {
        if (matchMap[i].matchId === matchId) {
            let thisMatch = matchMap[i];
            let judIndex = thisMatch.userIds.indexOf(judgeId);
            if (judIndex !== -1){
                thisMatch.userIds.splice(judIndex, 1);
                for (let k = 0; k < thisMatch.users.length; k++) {
                    if (thisMatch.users[k].userId === judgeId) {
                        let killUser = thisMatch.users.splice(k, 1);
                        socket.emit(thisMatch.matchId, {
                            type: 'kill',
                            users: killUser,
                            timeStamp: new Date().getTime()
                        });
                        break;
                    }
                }
                result.result = 'right';
            }
            if (thisMatch.userIds.length === 1){
                thisMatch.statue = 2;
                result.result = 'win';
            }
        }
    }
    res.json(result);
});


function getNewManPosition() {
    let maxX = matchSetting.width / 2 - 20;
    let randX = Math.random() * maxX * (Math.random() > 0.5 ? 1 : -1);
    let maxY = matchSetting.height / 2 - 20;
    let randY = Math.random() * maxY * (Math.random() > 0.5 ? 1 : -1);
    return [randX, randY];
}

router.all('/getInMatch', function(req, res, next) {
    let params = req.body || req.query || req.params;
    let returnResult = {};
    let userId = params.userId;
    let limitUser = params.matchType;

    let thisMatch = undefined;
    for (let i = 0; i < matchingMap.length; i++){
        if (matchingMap[i].limitUser === limitUser){
            thisMatch = matchingMap[i];
            break;
        }
    }
    if (!thisMatch){
        thisMatch = JSON.parse(JSON.stringify(defaultMatch));
        thisMatch.matchId = '' + new Date().getTime();
        thisMatch.limitUser = limitUser;
        matchingMap.push(thisMatch);
    }
    let result = {
        matchId: thisMatch.matchId,
    };
    let appendMan = JSON.parse(JSON.stringify(defaultMan));
    appendMan.userId = userId;
    thisMatch.users.push(appendMan);
    thisMatch.userIds.push(userId);
    if (thisMatch.users.length >= thisMatch.limitUser){
        for (let i = 0; i < thisMatch.botCount; i++){
            let appendMan = JSON.parse(JSON.stringify(defaultMan));
            appendMan.userId = '' + i;
            appendMan.position = getNewManPosition();
            thisMatch.users.push(appendMan);
        }
        thisMatch.statue = 1;
        thisMatch = matchingMap.splice(matchingMap.indexOf(thisMatch), 1)[0];
        matchMap.push(thisMatch);

        let userResult = [];
        for (let i = 0; i < thisMatch.users.length; i++) {
            let curTime = new Date().getTime();
            if (thisMatch.userIds.indexOf(thisMatch.users[i].userId) !== -1) {
                thisMatch.users[i].position = getNewManPosition();
                userResult.push(thisMatch.users[i]);
            }
        }
        setTimeout(function () {

            let interId = setInterval(function () {
                let intervalResult = {
                    type: '',
                    users: [],
                    timeStamp: new Date().getTime()
                };
                if (thisMatch.statue !== 1){
                    clearInterval(interId);
                    intervalResult.type = 'end';
                    intervalResult.users = thisMatch.users;
                    socket.emit(thisMatch.matchId, intervalResult);
                    return;
                }
                for (let i = 0; i < thisMatch.users.length; i++){
                    let curTime = new Date().getTime();
                    if (thisMatch.userIds.indexOf(thisMatch.users[i].userId) === -1){
                        let moveX = (thisMatch.users[i].walkFlag[3] - thisMatch.users[i].walkFlag[2]) * thisMatch.users[i].xSpeed * thisMatch.users[i].duringTime / 1000;
                        let moveY = (thisMatch.users[i].walkFlag[0] - thisMatch.users[i].walkFlag[1]) * thisMatch.users[i].ySpeed * thisMatch.users[i].duringTime / 1000;

                        if (Math.random() > 0.3){
                            let ranFlag = Math.floor(Math.random() * 4);
                            thisMatch.users[i].walkFlag[ranFlag] = 1;
                            let lrFlag = Math.random();
                            if (thisMatch.users[i].walkFlag[0]){
                                thisMatch.users[i].walkFlag = [
                                    Math.random() > 0.5 ? 1 : 0,
                                    0,
                                    lrFlag > 0.5 ? 1 : 0,
                                    lrFlag < 0.5 ? 1 : 0]
                            }
                            lrFlag = Math.random();
                            if (thisMatch.users[i].walkFlag[1]){
                                thisMatch.users[i].walkFlag = [
                                    0,
                                    Math.random() > 0.5 ? 1 : 0,
                                    lrFlag > 0.5 ? 1 : 0,
                                    lrFlag < 0.5 ? 1 : 0]
                            }
                            lrFlag = Math.random();
                            if (thisMatch.users[i].walkFlag[2]){
                                thisMatch.users[i].walkFlag = [
                                    lrFlag < 0.5 ? 1 : 0,
                                    lrFlag > 0.5 ? 1 : 0,
                                    Math.random() > 0.5 ? 1 : 0,
                                    0]
                            }
                            lrFlag = Math.random();
                            if (thisMatch.users[i].walkFlag[3]){
                                thisMatch.users[i].walkFlag = [
                                    lrFlag < 0.5 ? 1 : 0,
                                    lrFlag > 0.5 ? 1 : 0,
                                    0,
                                    Math.random() > 0.5 ? 1 : 0]
                            }
                        }
                        if (thisMatch.users[i].position[1] + moveY > matchSetting.height * 3 / 8){
                            thisMatch.users[i].walkFlag[0] = 0;
                            thisMatch.users[i].walkFlag[1] = 1;
                        }
                        if (thisMatch.users[i].position[1] + moveY < -matchSetting.height * 3 / 8){
                            thisMatch.users[i].walkFlag[0] = 1;
                            thisMatch.users[i].walkFlag[1] = 0;
                        }
                        if (thisMatch.users[i].position[0] + moveX > matchSetting.width * 3 / 8){
                            thisMatch.users[i].walkFlag[2] = 1;
                            thisMatch.users[i].walkFlag[3] = 0;
                        }
                        if (thisMatch.users[i].position[0] + moveX < -matchSetting.height * 3 / 8){
                            thisMatch.users[i].walkFlag[2] = 0;
                            thisMatch.users[i].walkFlag[3] = 1;
                        }
                        thisMatch.users[i].lastTime = curTime;
                        thisMatch.users[i].duringTime = 2000;
                        thisMatch.users[i].position[0] += moveX;
                        thisMatch.users[i].position[1] += moveY;
                        intervalResult.users.push(thisMatch.users[i]);
                    }
                }
                for (;userResult.length > 0;){
                    intervalResult.users.push(userResult.pop());
                }
                socket.emit(thisMatch.matchId, intervalResult);
            }, 2000);
        }, 500);
        result.type = 'start';
        result.users = thisMatch.users;
    }else {
        result.type = 'waiting';
    }
    res.json(result)

});
router.all('/loopMatch', function(req, res, next) {

});


module.exports = router;
