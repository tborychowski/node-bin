// http://openweathermap.org/api
var Args = require('arg-parser'), args,
	Msg  = require('node-msg'),
	_url = 'http://api.openweathermap.org/data/2.5/weather?appid=afe9ed75c174bff3c0f900fe0c15f994&units=metric&q=',

	_parseResponse = function (json) {
		if (args.params.mono) return Msg.log(json.name + ' ' + json.main.temp + '°C (' + json.weather[0].main + ')');
		Msg.log(
			Msg.paint(json.name + ' ', 'cyan bold') +
			Msg.paint(Math.round(json.main.temp) + '°C ', 'white bold') +
			Msg.paint('(' + json.weather[0].main + ')', 'grey')
		);
	},

	_init = function (town) {
		var resp = '', load = new Msg.loading();
		require('http').request(_url + encodeURIComponent(town), function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () {
				load.stop();
				_parseResponse(JSON.parse(resp));
			});
		}).on('error', Msg.error).end();
	};


args = Args('Weather', '1.0', 'OpenWeatherMap client');
args.add({ name: 'mono', desc: 'no colors', switches: ['-m', '--mono'] });
args.add({ name: 'town', desc: 'a place to get weather for', default: 'dublin,ireland' });
if (args.parse()) _init(args.params.town);
