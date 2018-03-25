let express = require('express');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let app = express();
let http = require('http');
let server = http.createServer(app);
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json,Authorization');
    next();
});
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ', err);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
let port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

let io = require('socket.io')(server);
io.origins('*:*');

let index = require('./routes/index');
let users = require('./routes/users');
let product = require('./routes/product');
let game = require('./routes/game');
game.setSocket(io);

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', index);
app.use('/users', users);
app.use('/product', product);
app.use('/game', game);
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  console.info(err.message);
  res.locals.error = {};
  res.status(err.status || 500);
  res.json({result: 'error'})
});

server.listen(port);
function normalizePort(val) {
    let port = parseInt(val, 10);
    if (isNaN(port)) {
        return val;
    }
    if (port >= 0) {
        return port;
    }
    return false;
}

module.exports = server;
