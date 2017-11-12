//Express module
var express = require('express');           

//creates an Express application. The express() funciton is a top-level function exported by the express module.
var app = express();

// libsodium crytpo magic
var sodium = require('sodium').api;

var bodyParser = require('body-parser');                
var http = require('http');
var https = require('https');
var request = require('request');
var logger = require("./utils/logger");
var mysql = require('mysql');
var uuid = require('node-uuid');
var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

// the websocket
var WebSocket = require('ws');


var fs = require('fs');


var connections = {};
var count = 0;


//these parameters are needed to connect to DB; used by almost every route
var dbUser = "mootiadmin";
var dbPassword = "DevPassword$1";
var db = "mooti";
var dbhost ="mootidev.c5yxa5wex9tp.us-west-1.rds.amazonaws.com";


var MONGODBHOST = "54.67.113.149";


var moedservices = "http://moeda-dev.us-east-1.elasticbeanstalk.com/";

// configure app to use bodyParser(); this will let us get the data from a POST
app.use(bodyParser.json({limit: '50mb'}));

// disable caching for all calls
app.use(function (req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    res.header('Content-type', 'application/json');
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('charset', 'utf-8');
    next();
});





var server = http.createServer(app);
var wss = new WebSocket.Server({ server });


/*
// generate our set of keys for this server
// used to generate the keys for the file

var serverKeys = sodium.crypto_box_keypair();
var secretKey = serverKeys.secretKey;
var publicKey = serverKeys.publicKey;

console.log('SecretKey =' + new Buffer(secretKey, 'binary').toString('base64'));
console.log('PublicKey = ' + new Buffer(publicKey, 'binary').toString('base64'));


var keys = {
    "secretkey": new Buffer(secretKey, 'binary').toString('base64'),
    "publicKey": new Buffer(publicKey, 'binary').toString('base64')
};

var readKeys = function(){
    // And then, to read it...
    keys = require("./filename.json");
    console.log('file == ' + JSON.stringify(keys));
};
console.log('writing');
fs.writeFile( "filename.json", JSON.stringify( keys ), "utf8", readKeys );
console.log('done');
*/



var keys = require("./filename.json");


wss.on('connection', function connection(ws, req) {
    //const location = url.parse(req.url, true);
    // You might use location.query.access_token to authenticate or share sessions
    // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

    count++

    console.log('connection established count = ' + count);
    //connections[count] =  ws;



    //console.log('Connections ==> ' + count);

    ws.on('message', function incoming(message) {
        console.log('received: %s', message);


        var data = JSON.parse(message);

        console.log('message type = ' + data.messageType);

        if(data.messageType == 'clientToServer'){

            /*
            {
                "messageType: "clientToServer",
                "nonce" : "<base64 encoded nonce>",
                "sendPubkey": "<base64 encoed pubkey>",
                "message" : "<base64 encoded message to send to server>"
            }
            */

            var nonce = new Buffer(data.nonce, 'base64');
            var senderPubkey = new Buffer(data.sender, 'base64');
            var message = new Buffer(data.message, 'base64');
            var recipient = data.recipient;


            // once we have pubkey, we will use this to identify the websocket connection
            connections[data.sender] = ws;

            console.log("Message == " + new Buffer(data.message, 'base64'));


            var plainMessage = sodium.crypto_box_open(Buffer.concat([Buffer.alloc(16), message], 16+message.length),nonce,senderPubkey, new Buffer(keys.secretkey, 'base64'));

            var response = JSON.parse(plainMessage);



            // call the web service
            request.post(
                moedservices + response.requestType,
                response,
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {

                        var plainText = Buffer.from(body);
                        nonce = Buffer.allocUnsafe(sodium.crypto_box_NONCEBYTES);
                        sodium.randombytes_buf(nonce);

                        var cipherMsg = sodium.crypto_box(plainText, nonce, senderPubkey, new Buffer(keys.secretkey, 'base64'));

                        console.log('Cipther Message = ' + cipherMsg);
                        var encodedMessage = new Buffer(cipherMsg.slice(16), 'binary').toString('base64');
                        //var encodedMessage = Buffer.from(cipherMsg, 0, cipherMsg.length).toString('base64');

                        console.log('encoded message = ' + encodedMessage);

                        var responseMessage = {'message': encodedMessage, 'nonce':new Buffer(nonce, 'binary').toString('base64')};

                        console.log('sending: ' + JSON.stringify(responseMessage));
                        ws.send(JSON.stringify(responseMessage));

                        console.log(body)
                    }
                }
            );
        }

    });

    //ws.send('something');
});

server.listen(8080, function listening() {
    console.log('Listening on %d', server.address().port);
});




function writeFolder(folderID, folderKey, clientId)
{
    console.log(folderID + " " + folderKey + " " + clientId)
    // connect to mooti db
    // Connection URL
    var url = 'mongodb://' + MONGODBHOST + ':27017/fileshare';

// Use connect method to connect to the server
    MongoClient.connect(url, function(err, db) {

        var response;
        if(err == null) {
            console.log("Connected successfully to server");
            // set the collection
            var folders = db.collection('folders');


            var nonce = Buffer.allocUnsafe(sodium.crypto_stream_NONCEBYTES);

            // create the document
            var folder = {folderID: folderID, folderKey :folderKey, owner : clientId, nonce:nonce.toString('base64')};
            folders.insertOne(folder, function(err, r){


                if(err == null){
                    response = {status : 'success'};


                }
                else{
                    response = {status :'FAILURE', message : 'insert failed ' +  err};
                }

                return  response;

            });
        }
        else{
            response = {status :'FAILURE', message : 'DB connection error ' +  err};
        }
        db.close();

        return response;
    });
}

// Pseudo config, because we don't use real config files; would be too easy obviously
var port = process.env.PORT || 8383;        // set our port

// get an instance of the express Router object
var router = express.Router();   


// ROUTES FOR OUR API
// =============================================================================

// test route to make sure everything is working (accessed at GET http://localhost:8080/)
router.get('/', function (req, res) {
    //this route does not require any parameters as input
    res.json({message: 'MOEDA WEB CORE API SERVER'});
});




//create post method for route '/pubkey'
router.route('/pubkey').post(function (req, res) {

    res.send(keys.publicKey);

});







// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/', router);

// START THE SERVER
// =============================================================================
app.listen(port);
logger.info('Server running on port ' + port);

