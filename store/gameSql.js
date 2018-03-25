let express = require('express');
let router = express.Router();
let pool = require('../db/dbPool');

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
    lastTime: 0,
    xSpeed: 40,
    ySpeed: 40,
    duringTime: 0,
    walkFlag: [0, 0, 0, 0],
    position: [50, 50],
};
let matchSetting = {
};


let socket = undefined;
router.setSocket = function(io) {
    io.on('connection', function(socket){
        console.log('a user connected');
        socket.on('disconnect', function(){
            console.log('user disconnected');
        });
        socket.on('chat message', function(msg){
            console.log('message: ' + msg);
        });
        socket.on('move', function(data){
            for (let i = 0; i < matchMap.length; i++) {
                if (matchMap[i].matchId === data.matchId) {
                    let thisMatch = matchMap[i];
                    for (let i = 0; i < thisMatch.users.length; i++){
                        if (thisMatch.users[i].userId === data.userId){
                            thisMatch.users[i].walkFlag = data.walkFlag;
                            thisMatch.users[i].position = data.position;
                            thisMatch.users[i].flag = 1;
                            io.emit(thisMatch.matchId, thisMatch.users[i]);
                        }
                    }
                }
            }
        });
    });
    io.on('error', (error) => {
        console.log('a user error');
    });
    socket = io;
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
                                socket.emit(thisMatch.matchId, thisMatch.users[i]);
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

    // let selectSql = 'SELECT * FROM ITEM_TYPES WHERE type = ?';
    // pool.getConnection(function(err, connection) {
    //     let params = req.body || req.query || req.params;
		// if (!connection) {
		// 	res.json({result: 'dberror'})
		// }
    //     let queryParam = [params.type];
		// if (params.uid) {
		// 	queryParam.push(params.uid);
		// 	selectSql += ' AND uid = ?';
		// }
		// if (params.exist) {
		// 	queryParam.push(params.exist);
		// 	selectSql += ' AND exist = ?';
		// }
    //
		// selectSql += ' order by uid asc';
    //
		// connection.query(selectSql, queryParam, function(err, result, fields) {
		// 	if (err) throw err;
		// 	connection.release();
		// 	res.json(result)
    //    });
    // });
});
router.all('/loopMatch', function(req, res, next) {

});


module.exports = router;
