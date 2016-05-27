// http://openweathermap.org/api
var Args = require('arg-parser'), args,
	Msg  = require('node-msg'),
	FS = require('fs'),
	Path = require('path'),
	_filePath = __dirname + Path.sep + Path.basename(__filename, '.js') + '.cache',

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

	_cache = function (resp) {
		FS.writeFile(_filePath, resp, function (err) {
			if (err) return Msg.error(err);
		});
	},

	_parseResponse = function (resp, params) {
		var json = JSON.parse(resp);
		if (params.short) return Msg.log(json.unread);
		if (json.unread === 0) Msg.log(Msg.cyan('No unread feeds!'));
		else Msg.log(Msg.white('You have ') + Msg.paint(json.unread, 'cyan bold') + Msg.white(' unread feeds'));
	},

	_init = function (params) {
		var resp = '', load;

		if (params.cacheFile) _filePath = params.cacheFile;
		if (params.cache && _isCached(params)) return _parseResponse(FS.readFileSync(_filePath), params);

		if (!params.short) load = new Msg.loading();
		require('http').request('http://reader.herhor.org/stats/herhor', function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () {
				if (load) load.stop();
				if (params.cache) _cache(resp);
				_parseResponse(resp, params);
			});
		}).on('error', Msg.error).end();
	};


args = new Args('myreader', '1.0', 'MyReader Checker');
args.add({ name: 'short', switches: [ '-s', '--short' ], desc: 'Just show the number of unread messages' });
args.add({ name: 'cache', switches: [ '-c', '--cache' ], desc: 'Cache results in a file' });
args.add({ name: 'cacheFile', switches: [ '-f', '--file' ], desc: 'Cache File path (file_name.cache)' });
args.add({ name: 'time', switches: [ '-t', '--time' ], desc: 'Show cached result if not older than "time"', value: 'min', default: 5 });

if (args.parse()) _init(args.params);
