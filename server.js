/*globals require, __dirname, console*/
'use strict';

var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	collections = {
		clients: [],
		taxis: [{}, {}]
	};

server.listen(3000);

app.use('/public', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/public/index.html');
});

io.sockets.on('connection', function (socket) {

	socket.on('setClient', function (data) {
		data.socketId = socket.id;
		socket.emit('activeTaxis', collections.taxis);
	});

	socket.on('setTaxi', function (data) {
		data.socketId = socket.id;
		collections.taxis.push(data);
	});

	socket.on('disconnect', function() {
		
	});

});
