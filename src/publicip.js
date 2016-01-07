// jshint loopfunc: true, latedef: false
var Args = require('arg-parser'), args,
	Msg  = require('node-msg'),
	HTTP = require('http'),
	extIpServ = 'icanhazip.com', // or: api.exip.org/?call=ip, or: checkip.dyndns.org

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
		var f = FS.readFileSync(_filePath);
		if (!f || !f.length) return false;

		return true;		// else - cache ok - return cached
	},

	_cache = function (resp) {
		FS.writeFile(_filePath, resp, function (err) {
			if (err) return Msg.error(err);
		});
	},

	_init = function (params) {
		var resp = '';
		if (params.cacheFile) _filePath = params.cacheFile;
		if (params.cache && _isCached(params)) return Msg.log(FS.readFileSync(_filePath));

		HTTP.request({ hostname: extIpServ, agent: false }, function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () {
				resp = resp.trim();
				if (params.cache) _cache(resp);
				Msg.log(resp);
			});
		}).on('error', Msg.error).end();
	};





args = new Args('publicip', '1.0', 'Public IP checker');
args.add({ name: 'cache', switches: [ '-c', '--cache' ], desc: 'Cache results in a file' });
args.add({ name: 'cacheFile', switches: [ '-f', '--file' ], desc: 'Cache File path (file_name.cache)' });
args.add({ name: 'time', switches: [ '-t', '--time' ], desc: 'Show cached result if not older than "time"', value: 'min', default: 180 });

if (args.parse()) _init(args.params);
