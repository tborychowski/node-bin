// http://openweathermap.org/api
var Args = require('arg-parser'), args,
	Msg  = require('node-msg'),

	_parseResponse = function (json, params) {
		if (params.short) return Msg.log(json.unread);
		if (json.unread === 0) Msg.log(Msg.cyan('No unread feeds!'));
		else Msg.log(Msg.white('You have ') + Msg.paint(json.unread, 'cyan bold') + Msg.white(' unread feeds'));
	},

	_init = function (params) {
		var resp = '', load;
		if (!params.short) load = new Msg.loading();
		require('http').request('http://reader.herhor.org/stats/herhor', function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () {
				if (load) load.stop();
				_parseResponse(JSON.parse(resp), params);
			});
		}).on('error', Msg.error).end();
	};


args = Args('myreader', '1.0', 'MyReader Checker');
args.add({ name: 'short', switches: [ '-s', '--short' ], desc: 'Just show the number of unread messages' });

if (args.parse()) _init(args.params);
