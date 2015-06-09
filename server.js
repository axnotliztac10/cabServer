/*globals require, __dirname, console*/
'use strict';

var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	taxis = [];

server.listen(3000);

app.use('/public', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/public/index.html');
});

var client = {
		icon: 'http://shift-portal.appspot.com/assets/imgs/a_white.png'
	},
	taxi = {
		icon: ''
	};

io.sockets.on('connection', function (socket) {

	socket.on('newClient', function () {
		socket.emit('setUser', client);
	});

	socket.on('newTaxi', function (data) {
		var taxiId = taxis.push(data) - 1;
		taxis[taxiId].latitude = taxis[taxiId].latitude - 0.003
		taxis[taxiId].longitude = taxis[taxiId].longitude - 0.003
		taxis[taxiId].type = 'taxi';
		taxis[taxiId].id = taxiId;
		taxis[taxiId].socketId = socket.id;
		socket.emit('setUser', taxi);
		socket.broadcast.emit('addTaxi', taxis[taxiId]);
	});

	socket.on('taxiRequest', function (data) {
		io.sockets.socket(data.socketId).emit('taxiRequest', {
			socketId: socket.id,
			marker: data.marker
		});
	})

	socket.on('accept', function (data) {
		io.sockets.socket(data.socketId).emit('accepted', {
			accepted: data.accepted,
			marker: data.marker
		});
	})

});
