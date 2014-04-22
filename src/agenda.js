var Args = require('arg-parser'), args,
	Msg = require('node-msg'),
	FS = require('fs'),
	Path = require('path'),
	_url = '?alt=json&orderby=starttime&singleevents=true&sortorder=ascending&futureevents=true&max-results=5',

	_confFname = __dirname + Path.sep + Path.basename(__filename, Path.extname(__filename)) + '.json',
	_conf = FS.existsSync(_confFname) ? require(_confFname) : null,

	noConfig = function () {
		Msg.error('No config file!');
		var sample = '[\n\t"your-google-calendar-xml-url"\n]';
		FS.writeFile(_confFname, sample, function (err) {
			if (err) Msg.error(err);
			else Msg.log('A sample config file was created: ' + _confFname);
		});
	},

	_parseEvent = function (str) {
		var ev = {}, lines = str.replace(/<br>/g, '').split('\n');
		lines.forEach(function (line) {
			line = line.trim().replace(/Replaces.+$/g, '');
			var b;
			if (!line) return;
			if (!line.indexOf('Event Status:')) ev.status = line.replace(/Event Status: /, '');
			if (!line.indexOf('When:')) {
				b = line.replace(/When: /, '').split(' ');
				ev.date = [ b[0], ('0' + b[1]).substr(-2), b[2]].join(' ');
			}
		});
		return ev;
	},

	_parseResponse = function (resp) {
		// var name = resp.feed.title.$t, lud = new Date(resp.feed.updated.$t);
		var name, ev, today = (new Date()).toUTCString().substr(0, 11).replace(/,/, '');
		Msg.log(Msg.paint(today, 'yellow bold') + Msg.paint('  TODAY', 'white bold'));
		Msg.log(Msg.yellow('----------') + '  --------------------------------');
		resp.feed.entry.forEach(function (ent) {
			name = ent.title.$t;
			ev = _parseEvent(ent.summary.$t);
			Msg.log(Msg.yellow(ev.date) + '  ' + name.trim());
		});
	},

	_init = function () {
		if (!_conf) return noConfig();
		if (_conf.length) _url = _conf[0] + _url;
		var resp = '', load = new Msg.loading();
		require('https').request(_url, function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () { load.stop(); _parseResponse(JSON.parse(resp || '')); });
		}).on('error', Msg.error).end();
	};


args = new Args('Calendar', '1.1', 'List tasks for today');
if (args.parse()) _init(args.params);
