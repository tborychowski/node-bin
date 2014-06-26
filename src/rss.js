// http://openweathermap.org/api
var Args = require('arg-parser'), args,
	Msg  = require('node-msg'),

	_parseResponse = function (json) {
		if (json.unread === 0) Msg.log(Msg.cyan('No unread feeds!'));
		else Msg.log(Msg.white('You have ') + Msg.paint(json.unread, 'cyan bold') + Msg.white(' unread feeds'));
	},

	_init = function (town) {
		var resp = '', load = new Msg.loading();
		require('http').request('http://reader.herhor.org/stats/herhor', function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () {
				load.stop();
				_parseResponse(JSON.parse(resp));
			});
		}).on('error', Msg.error).end();
	};


args = Args('myreader', '1.0', 'MyReader Checker');
if (args.parse()) _init(args.params);
