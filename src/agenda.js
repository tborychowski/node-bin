var Args = require('arg-parser'), args,
	Msg = require('node-msg'),
	FS = require('fs'),
	Path = require('path'),

	_url = '?alt=json&orderby=starttime&singleevents=true&sortorder=ascending&futureevents=true',
	_filePath = __dirname + Path.sep + Path.basename(__filename, '.js') + '.cache',

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


	/**
	 * Check if there are cached results and return true if there are
	 * @return {boolean} true - there is cache; false - no cache, file doesnt exist or is too old
	 */
	_isCached = function (params) {
		// file not found - return false
		if (!FS.existsSync(_filePath)) return false;

		// file too old - return false
		var fileModTime = new Date(FS.statSync(_filePath).mtime), diff = (new Date() - fileModTime) / 60000;
		if (diff >= params.time) return false;

		// file read error - return false
		var f = FS.readFileSync(_filePath), json;
		try { json = JSON.parse(f); } catch(e) {}
		if (!json) return false;

		return true;		// else - return true
	},

	_cache = function (agenda) {
		FS.writeFile(_filePath, JSON.stringify(agenda), function (err) {
			if (err) return Msg.error(err);
		});
	},

	_pad = function (n) { return new Array(n || 0).join(' '); },
	_today = function () { var now = new Date(); now.setHours(0); now.setMinutes(0); now.setSeconds(0); return now; },

	/**
	 * merge all calendars and re-sort by date
	 */
	_mergeCals = function (cals) {
		var agenda = [].concat.apply([], cals);
		agenda.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
		return agenda;
	},



	_printAgenda = function (agenda, params) {
		var date, now = _today(), tod = now.toDateString().slice(0, -4), lim = new Date(), table = [],
			offset = parseInt(params.offset, 10) || 0;

		if (params.limit) lim = lim.setDate(lim.getDate() + parseInt(params.limit, 10));

		if (!params.short) table.push([ tod, 'TODAY' ]);
		agenda.forEach(function (item) {
			date = new Date(item.date);
			if (date < now || date > lim) return;
			table.push([ item.dateStr + (item.isFullDay ? '' : item.timeStr), item.name ]);
		});

		if (!params.short) Msg.table(table);

		// for conky
		else table.forEach(function (row) {
			// Msg.log(row[0] + _pad(19 - row[0].length) + row[1]);
			Msg.log('${color ' + (tod === row[0] ? 'dddddd' : '888888') + '}' +
				'${goto ' + offset + '}' + row[0] +
				'${goto ' + (offset + 105) + '}' + row[1]);
		});
	},


	_parseResponse = function (resp) {
		var date, st, agenda = [];
		resp.feed.entry.forEach(function (ent) {
			st = ent.gd$when[0].startTime;
			date = new Date(st);
			agenda.push({
				name      : ent.title.$t,
				content   : ent.content.$t,
				isFullDay : (st.length === 10),
				date      : st,
				dateStr   : date.toDateString().slice(0, -4),
				timeStr   : date.toTimeString().substr(0, 5)
			});
		});
		return agenda;
	},


	_load = function (url, cb) {
		var resp = '';
		require('https').request(url + _url, function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () { cb(JSON.parse(resp || '')); });
		}).on('error', Msg.error).end();
	},


	_init = function (params) {
		if (!_conf || !_conf.length) return noConfig();
		var loader, loaded = 0, toLoad = _conf.length, agenda, cals = [];

		if (params.cacheFile) _filePath = params.cacheFile;
		if (params.cache && _isCached(params)) return _printAgenda(JSON.parse(FS.readFileSync(_filePath)), params);

		if (!params.short) loader = new Msg.loading();

		_conf.forEach(function (url) {
			_load(url, function (resp) {
				agenda = _parseResponse(resp);
				cals.push(agenda);
				if (++loaded < toLoad) return;

				if (loader) loader.stop();
				agenda = _mergeCals(cals);
				if (params.cache) _cache(agenda);
				_printAgenda(agenda, params);
			});
		});

	};


args = new Args('Agenda', '2.0', 'List tasks for today');
args.add({ name: 'limit', switches: [ '-l', '--limit' ], desc: 'How many days in the future', value: 'DAYS', default: 3 });
args.add({ name: 'short', switches: [ '-s', '--short' ], desc: 'Don\'t show table headers' });
args.add({ name: 'cache', switches: [ '-c', '--cache' ], desc: 'Cache results in a file' });
args.add({ name: 'cacheFile', switches: [ '-f', '--file' ], desc: 'Cache File path (file_name.cache)' });
args.add({ name: 'time', switches: [ '-t', '--time' ], desc: 'Show cached result if not older than "time"', value: 'min', default: 30 });
args.add({ name: 'offset', switches: [ '-o', '--offset' ], desc: 'Offset text for conky', value: 'px', default: 0 });

if (args.parse()) _init(args.params);
