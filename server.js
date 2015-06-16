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
		collections.clients[socket.id] = data;

		socket.emit('setClientResponse', data);
		socket.emit('activeTaxis', collections.taxis);
	});

	socket.on('setTaxi', function (data) {
		data.socketId = socket.id;
		collections.taxis[socket.id] = data;

		socket.emit('setTaxiResponse', data);
	});

	socket.on('disconnect', function() {
		if (collections.taxis[socket.id]) delete collections.taxis[socket.id];
		if (collections.clients[socket.id]) delete collections.clients[socket.id];
		io.sockets.broadcast('activeTaxis', collections.taxis);
	});

});
