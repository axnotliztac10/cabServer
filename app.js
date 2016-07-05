/*globals require, __dirname, console*/
'use strict';

var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server, { log: false }),
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

server.listen(process.env.port);

app.get('/', function (req, res) {
	res.json({'status': 'ok'});
});

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
    tokens = JSON.parse(str);
  });
});

var sendPushNotification = function (message, token) {
	var notification = {  
	  "tokens": token || tokens,
	  "notification":{
	    "alert": message,
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
};

var getSocketId = function (user, type) {
	for (var i in collections[type]) {
		if (collections[type][i].id == user.id) return i;
	}
}

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
	});

	socket.on('setAdmin', function (data) {
		socket.emit('activeTaxis', collections.taxis);
	});

	socket.on('updateActiveTaxis', function (data) {
		socket.emit('activeTaxis', collections.taxis);
	});

	socket.on('disconnect', function() {
		if (collections.taxis[socket.id]) delete collections.taxis[socket.id];
		if (collections.clients[socket.id]) delete collections.clients[socket.id];
		socket.broadcast.emit('activeTaxis', collections.taxis);
	});

	socket.on('taxiRequest', function (data) {
		if (!data || !data.taxi) return;
		io.sockets.socket(getSocketId(data.taxi, 'taxis')).emit('taxiRequest', {
			client: data.client,
			destination: data.destination,
			ride: data.ride,
			destination_position: data.destination_position
		});

		sendPushNotification('Tienes una solicitud nueva.', [data.taxi.token]);
	});

	socket.on('taxiResponseToRequest', function (data) {
		if (!data || !data.client) return;
		io.sockets.socket(getSocketId(data.client, 'clients')).emit('taxiResponseToRequest', {
			client: data.client,
			taxi: data.taxi,
			accepted: data.accepted
		});

		sendPushNotification('Servicio aceptado.', [data.client.token]);
	});

	socket.on('finishAndFare', function (data) {
		if (!data || !data.client) return;
		io.sockets.socket(getSocketId(data.client, 'clients')).emit('finishAndFare', {
			client: data.client,
			taxi: data.taxi,
			fare: data.fare,
			clientCard: data.clientCard
		});
	});

	socket.on('updatePosition', function (data) {
		if (collections.taxis[socket.id]) delete collections.taxis[socket.id];
		collections.taxis[socket.id] = data.taxi;
		socket.broadcast.emit('activeTaxis', collections.taxis);
	});

	socket.on('cancelFromTaxi', function (data) {
		if (!data || !data.client) return;
		io.sockets.socket(getSocketId(data.client, 'clients')).emit('canceled', {
			taxi: data.taxi,
			client: data.client
		});
	});

	socket.on('cancelFromClient', function (data) {
		if (!data || !data.taxi) return;
		io.sockets.socket(getSocketId(data.taxi, 'taxis')).emit('canceled', {
			taxi: data.taxi,
			client: data.client
		});
	});

	socket.on('setArrived', function (data) {
		if (!data || !data.client) return;
		io.sockets.socket(getSocketId(data.client, 'clients')).emit('getArrived', {
			taxi: data.taxi,
			client: data.client
		});

		sendPushNotification('El conductor ha llegado a tu posicion.', [data.client.token]);
	});

	socket.on('sendPaymentConfirm', function (data) {
		if (!data || !data.taxi) return;
		io.sockets.socket(getSocketId(data.taxi, 'taxis')).emit('sendPaymentConfirm', {
			taxi: data.taxi,
			client: data.client,
			payment_type: data.payment_type
		});

		sendPushNotification('Pago existoso.', [data.client.token]);
	});

	socket.on('destinationSelectedClient', function (data) {
		if (!data || !data.taxi) return;
		io.sockets.socket(getSocketId(data.taxi, 'taxis')).emit('destinationSelected', {
			taxi: data.taxi,
			client: data.client,
			destination: data.destination
		});
	});

	socket.on('destinationSelectedDriver', function (data) {
		if (!data || !data.client) return;
		io.sockets.socket(getSocketId(data.client, 'clients')).emit('destinationSelected', {
			taxi: data.taxi,
			client: data.client,
			destination: data.destination
		});
	});

});
