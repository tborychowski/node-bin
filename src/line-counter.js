var Args = new require('arg-parser'), args,
	Msg = require('node-msg'),
	FS = require('fs'),
	Path = require('path'),

	walk = function (path, ext) {
		var results = [];
		FS.readdirSync(path).forEach(function (file) {
			file = path + '/' + file;
			if (FS.statSync(file).isDirectory()) results = results.concat(walk(file, ext));
			else if (!ext || (ext && Path.extname(file) === ext)) results.push(file);
		});
		return results;
	},

	countLines = function (path, ext) {
		if (!FS.existsSync(path)) return Msg.error('File or folder not found!');

		var fo = FS.lstatSync(path), count = 0, files = [];
		ext = (ext && ext.length ? '.' + ext.replace(/\./g, '') : false);		// no dots in ext

		if (fo.isDirectory()) files = walk(path, ext);
		else {
			if (ext && Path.extname(path) !== ext) return Msg.error('File has a different extension');
			files = [ path ];
		}
		files.forEach(function (file) { count += FS.readFileSync(file).toString().split('\n').length; });

		Msg.log('\nThere is ' + Msg.paint(count, 'cyan bold') + ' lines of code');
	};


args = new Args('LineCounter', '1.0', 'Count lines of code in path');
args.add({ name: 'ext', desc: 'only count in files with this extension\ne.g. --ext=js', switches: ['-e', '--ext'], value: 'extension' });
args.add({ name: 'path', desc: 'path (file or folder)', required: true });

if (args.parse()) countLines(args.params.path, args.params.ext);