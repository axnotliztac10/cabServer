/*globals require, __dirname, console*/
'use strict';

var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	collections = {
		clients: {},
		taxis: {}
	};

server.listen(3000);

app.use('/public', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/public/index.html');
});

io.sockets.on('connection', function (socket) {

	socket.on('setClient', function (data) {
		data.socketId = socket.id;
		data.id = socket.id; //Change by real client Id
		data.type = 'client';
		collections.clients[socket.id] = data;

		socket.emit('setClientResponse', data);
		socket.emit('activeTaxis', collections.taxis);
	});

	socket.on('setTaxi', function (data) {
		data.socketId = socket.id;
		data.id = socket.id; //Change by real taxi Id
		data.type = 'taxi';
		collections.taxis[socket.id] = data;

		socket.emit('setTaxiResponse', data);
		socket.broadcast.emit('activeTaxis', collections.taxis);
	});

	socket.on('disconnect', function() {
		if (collections.taxis[socket.id]) delete collections.taxis[socket.id];
		if (collections.clients[socket.id]) delete collections.clients[socket.id];
		socket.broadcast.emit('activeTaxis', collections.taxis);
	});

	socket.on('taxiRequest', function (data) {
		io.sockets.socket(data.taxi.socketId).emit('taxiRequest', {
			client: data.client
		});
	});

	socket.on('taxiResponseToRequest', function (data) {
		io.sockets.socket(data.client.socketId).emit('taxiResponseToRequest', {
			client: data.client,
			taxi: data.taxi,
			accepted: true
		});
	});

	socket.on('updatePosition', function (data) {
		io.sockets.socket(data.clientSocketId).emit('positionUpdated', {
			taxi: data.taxi,
			distance: data.distance
		});
	});

	socket.on('cancelFromTaxi', function (data) {
		io.sockets.socket(data.client.socketId).emit('canceled', {
			taxi: data.taxi,
			client: data.client
		});
	});

	socket.on('cancelFromClient', function (data) {
		io.sockets.socket(data.taxi.socketId).emit('canceled', {
			taxi: data.taxi,
			client: data.client
		});
	});

});
