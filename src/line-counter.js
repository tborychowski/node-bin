var Args = new require('arg-parser'), args,
	Msg = require('node-msg'),
	FS = require('fs'),
	Path = require('path'),
	sample = 'e.g.\n' + Path.basename(__filename, '.js') + ' -e js\n' + Path.basename(__filename, '.js') + ' --ext=js',

	_numberFormat = function (number, prec) {
		var ext, name, numS, rgx = /(\d+)(\d{3})/;
		number = number || '0';
		prec = prec || 0;
		numS = ('' + number).split('.');
		name = numS[0];
		ext = numS[1];
		if (prec > 0) ext = ((ext || '') + new Array(prec + 1).join('0')).substr(0, prec);
		else ext = '';
		while (rgx.test(name)) name = name.replace(rgx, '$1' + ',' + '$2');
		return name + (ext ? '.' + ext : '');
	},

	_sizeFormat = function (size) { return _numberFormat((size / 1024).toFixed(2), 2); },

	_walk = function (path, ext) {
		var results = [];
		FS.readdirSync(path).forEach(function (file) {
			file = path + '/' + file;
			if (FS.statSync(file).isDirectory()) results = results.concat(_walk(file, ext));
			else if (!ext || (ext && Path.extname(file) === ext)) results.push({ path: file });
		});
		return results;
	},



	_readFiles = function (params) {
		if (!FS.existsSync(params.path)) return Msg.error('File or folder not found!');

		var fo = FS.lstatSync(params.path), f, files = [];
		if (fo.isDirectory()) files = _walk(params.path, params.ext);
		else {
			if (params.ext && Path.extname(params.path) !== params.ext) {
				return Msg.error('File has a different extension');
			}
			files = [ { path: params.path } ];
		}

		files.forEach(function (file) {
			f = FS.readFileSync(file.path).toString();
			file.lines = f.split('\n').length;
			file.size = f.length;
		});
		return files;
	},

	_stats = function (params, files) {
		var total = {
				files: _numberFormat(files.length),
				lines: 0,
				size: 0,
				table: [[ 'Path', 'Size', 'Lines' ]]
			};

		files.forEach(function (file) {
			total.lines += file.lines;
			total.size += file.size;
			total.table.push([ file.path, _sizeFormat(file.size) + ' KB', file.lines ]);
		});

		return total;
	},

	_formatOutput = function (params, total) {
		var size = _sizeFormat(total.size), lines = _numberFormat(total.lines);
		Msg.log(
			'\nLines : ' + Msg.paint(lines, 'cyan bold') +
			'\nSize  : ' + Msg.paint(size, 'cyan bold') + Msg.grey(' KB') +
			'\nFiles : ' + Msg.paint(total.files, 'cyan bold') + Msg.grey(' [*' + (params.ext || '.*') + ']\n')
		);
		if (params.list) Msg.table(total.table, 2, 'DESC', params.limit);
	},

	_start = function (params) {
		params.ext = (params.ext && params.ext.length ? '.' + params.ext.replace(/\./g, '') : false);		// no dots in ext
		var files = _readFiles(params), stats = _stats(params, files);
		_formatOutput(params, stats);
	};


args = new Args('LineCounter', '1.1', 'Count lines of code in path');
args.add({ name: 'ext', desc: 'only count in files with this extension, ' + sample, switches: ['-e', '--ext'], value: 'extension' });
args.add({ name: 'list', desc: 'show file list', switches: ['-l', '--list'] });
args.add({ name: 'limit', desc: 'limit file list\n(requires -l switch)', switches: ['--limit'], value: 'max' });
args.add({ name: 'path', desc: 'path (file or folder)', default: '.' });

if (args.parse()) _start(args.params);