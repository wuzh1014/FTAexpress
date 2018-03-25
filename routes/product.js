let express = require('express');
let router = express.Router();
let pool = require('../db/dbPool');


let matchMap = [];
let matchingMap = [];
let defaultMatch = {
    matchId: '',
    userIds: [],
    mapId: 1,
    statue: 0, //0未开始 1正在进行 2已结束
    createTime: '',
    startTime: '',
    endTime: '',
};

router.get('/socket', function(req, res, next) {
  res.send(`
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.4/socket.io.js"></script>
<script>
  var socket = io('localhost:3000');
</script>
    `);
});



router.all('/getInMatch', function(req, res, next) {

    let params = req.body || req.query || req.params;
    let returnResult = {};

    // JSON.parse(JSON.stringify(that.defaultItem.typeNames));

    let userId = params.userId;



    let selectSql = 'SELECT * FROM ITEM_TYPES WHERE type = ?';
    pool.getConnection(function(err, connection) {
        let params = req.body || req.query || req.params;
		if (!connection) {
			res.json({result: 'dberror'})
		}
        let queryParam = [params.type];
		if (params.uid) {
			queryParam.push(params.uid);
			selectSql += ' AND uid = ?';
		}
		if (params.exist) {
			queryParam.push(params.exist);
			selectSql += ' AND exist = ?';
		}

		selectSql += ' order by uid asc';

		connection.query(selectSql, queryParam, function(err, result, fields) {
			if (err) throw err;
			connection.release();  
			res.json(result)
       });
    });
});


module.exports = router;
