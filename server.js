/*globals require, __dirname, console*/
'use strict';

var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	collections = {
		clients: {},
		taxis: {}
	},
	ionicPushServer = require('ionic-push-server'),
	credentials = {  
	    IonicApplicationID : "6588f54b",
	    IonicApplicationAPIsecret : "f5001dc97adad007aa04c01c078ef0927bc35b556e348cb7"
	},
	http = require('http'),
	tokens = [];

server.listen(3000);

app.use('/public', express.static(__dirname + '/public'));
var adminPath = require('path').resolve(__dirname + "/../admin");
app.use(express.static(adminPath));

var options = {
  host: 'taxipreferente.azurewebsites.net',
  path: '/api/Admin/Devices'
};

http.get(options, function(response) {
  var str = ''
  response.on('data', function (chunk) {
    str += chunk;
  });

  response.on('end', function () {
    var tokens = JSON.parse(str);
  });
});

app.get('/', function (req, res) {
	res.sendfile(adminPath + '/index.html');
});

io.sockets.on('connection', function (socket) {

	socket.on('setClient', function (data) {
		data.socketId = socket.id;
		data.type = 'client';
		collections.clients[socket.id] = data;

		socket.emit('setClientResponse', data);
		socket.emit('activeTaxis', collections.taxis);
	});

	socket.on('setTaxi', function (data) {
		data.socketId = socket.id;
		data.type = 'taxi';
		collections.taxis[socket.id] = data;

		socket.emit('setTaxiResponse', data);
		socket.broadcast.emit('activeTaxis', collections.taxis);

		var notification = {  
		  "tokens": tokens,
		  "notification":{
		    "alert":"Probando notificaciones PUSH con Ionic!",
		    "ios":{
		      "badge":1,
		      "sound":"chime.aiff",
		      "expiry": 1423238641,
		      "priority": 10,
		      "contentAvailable": true,
		      "payload":{
		        "key1":"value",
		        "key2":"value"
		      }
		    }
		  } 
		};

		ionicPushServer(credentials, notification);  
	});

	socket.on('setAdmin', function (data) {
		socket.emit('activeTaxis', collections.taxis);
	});

	socket.on('disconnect', function() {
		if (collections.taxis[socket.id]) delete collections.taxis[socket.id];
		if (collections.clients[socket.id]) delete collections.clients[socket.id];
		socket.broadcast.emit('activeTaxis', collections.taxis);
	});

	socket.on('taxiRequest', function (data) {
		if (!data || !data.taxi || !data.taxi.socketId) return;
		io.sockets.socket(data.taxi.socketId).emit('taxiRequest', {
			client: data.client,
			destination: data.destination,
			ride: data.ride,
			destination_position: data.destination_position
		});
	});

	socket.on('taxiResponseToRequest', function (data) {
		if (!data || !data.client || !data.client.socketId) return;
		io.sockets.socket(data.client.socketId).emit('taxiResponseToRequest', {
			client: data.client,
			taxi: data.taxi,
			accepted: data.accepted
		});
	});

	socket.on('finishAndFare', function (data) {
		//if (!data || !data.client || !data.client.socketId) return;
		io.sockets.socket(data.client.socketId).emit('finishAndFare', {
			client: data.client,
			taxi: data.taxi,
			fare: data.fare
		});
	});

	socket.on('updatePosition', function (data) {
		if (collections.taxis[socket.id]) delete collections.taxis[socket.id];
		collections.taxis[socket.id] = data.taxi;
		socket.broadcast.emit('activeTaxis', collections.taxis);
	});

	socket.on('cancelFromTaxi', function (data) {
		if (!data || !data.client || !data.client.socketId) return;
		io.sockets.socket(data.client.socketId).emit('canceled', {
			taxi: data.taxi,
			client: data.client
		});
	});

	socket.on('cancelFromClient', function (data) {
		if (!data || !data.taxi || !data.taxi.socketId) return;
		io.sockets.socket(data.taxi.socketId).emit('canceled', {
			taxi: data.taxi,
			client: data.client
		});
	});

	socket.on('setArrived', function (data) {
		if (!data || !data.client || !data.client.socketId) return;
		io.sockets.socket(data.client.socketId).emit('getArrived', {
			taxi: data.taxi,
			client: data.client
		});
	});

});
