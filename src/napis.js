//zip pass: iBlm8NTigvru0Jr0
//http://napiprojekt.pl/unit_napisy/dl.php?l=PL&f=99656e9af148e5b1fdb065c07c35e110&t=c0f4a&v=other&kolejka=false&nick=&pass=&napios=nt

var
	Args    = require('arg-parser'), args,
	Msg     = require('node-msg'),
	FS = require('fs'),
	BUF = require('buffer').Buffer,
	CRYPT = require('crypto'),
	HTTP = require('http'),
	EXE = require('child_process').exec,
	Path = require('path'),

	_videos = [ '.avi', '.mpg', '.mpeg', '.mp4', '.mov' ],
	_loader = null,


	/*** HELPERS ******************************************************************************************************/
	/**
	 * Find files (full paths) matching _videos extensions in the given folder (not recursive)
	 * @param   {string}  dir  folder name
	 * @return  {array}        array of files (paths & names)
	 */
	_getFilesInFolder = function (dir) {
		return FS.readdirSync(dir)
			.filter(function (f) {
				return (FS.statSync(Path.resolve(dir, f)).isFile() && _videos.indexOf(Path.extname(f)) > -1);
			})
			.map(function (f) { return dir + Path.sep + f; });
	},

	_f = function (z) {
		var b = [], j, i = 0, t, v, a, m, idx = [0xe, 0x3, 0x6, 0x8, 0x2], mul = [2, 2, 5, 4, 3], add = [0, 0xd, 0x10, 0xb, 0x5];
		for (; i < 5; i++) {
			a = add[i];
			m = mul[i];
			j = idx[i];
			t = a + parseInt(z[j], 16);
			v = parseInt(z.substring(t, t + 2), 16);
			b.push((v * m).toString(16).substr(-1));
		}
		return b.join('');
	},

	_notFound = function (item) { Msg.log(Msg.yellow('-- ') + Msg.white(item.filename)); },
	_found = function (item, lang) { Msg.log(Msg.green(lang) + ' ' + Msg.white(item.filename)); },
	/*** HELPERS ******************************************************************************************************/



	_unzip = function (item, lang) {
		var cmd = '7z e -y -so -bd -piBlm8NTigvru0Jr0 ' + item.zip + ' > ' + item.txt;
		cmd = '"c:\\Program Files\\7-Zip\\7z.exe" x -y -so -bd -piBlm8NTigvru0Jr0 ' + item.zip + ' > ' + item.txt;

		EXE(cmd, function (error, stdout, stderr) {
			FS.unlink(item.zip);
			if (!error) return _found(item, lang);
			FS.unlink(item.txt);
			Msg.error(stderr);
		});
	},

	//str = "http://napiprojekt.pl/unit_napisy/dl.php?l=PL&f="+hex+"&t="+f(hex)+"&v=other&kolejka=false&nick=&pass=&napios=nt"
	//http://napiprojekt.pl/unit_napisy/dl.php?l=PL&f=99656e9af148e5b1fdb065c07c35e110&t=c0f4a&v=other&kolejka=false&nick=&pass=&napios=nt
	_downloadSubs = function (item, lang) {
		var options = { host: 'napiprojekt.pl', port: '80',
				path: '/unit_napisy/dl.php?v=other&kolejka=false&nick=&pass=&napios=nt&l=' + lang +
				'&f=' + item.hash + '&t=' + _f(item.hash)
				// '&f=99656e9af148e5b1fdb065c07c35e110&t=c0f4a' // success test
			};
		HTTP.request(options, function (response) {
			var file = FS.createWriteStream(item.zip, { 'flags': 'a' }), found = null;
			response.on('data', function (chunk) {
				if (chunk.toString() === 'NPc0') found = false;
				else file.write(chunk, 'binary');
			});
			response.on('end', function () { file.end(); });

			file.on('finish', function () {
				if (found !== false) return _unzip(item, lang);				// found something - unzip it
				FS.unlink(item.zip);
				if (lang === 'EN') return _notFound(item);					// EN also not found
				return _downloadSubs(item, 'EN');							// try again in EN
			});
		})
		.on('error', Msg.error).end();
	},

	/**
	 * Calculate special hash for a file
	 */
	_getHash = function (item) {
		FS.open(item.fullname, 'r', function (status, fd) {
			if (status) return Msg.error(status.message);
			var buffer = new BUF(10485760),
				md5 = CRYPT.createHash('md5'),
				num = FS.readSync(fd, buffer, 0, 10485760, 0),
				ft = buffer.toString('binary', 0, num);
			md5.update(ft);
			item.hash = md5.digest('hex');
			_downloadSubs(item, 'PL');
		});
	},

	/**
	 * Find all files for a path
	 */
	_getFiles = function (path) {
		if (!path) return;
		var items = [], fname;
		if (path === '*') path = __dirname;										// current dir
		path = Path.normalize(Path.resolve(path));

		if (FS.statSync(path).isFile()) path = [ path ];						// just single file
		else path = _getFilesInFolder(path);									// files in given dir

		path.forEach(function (p) {
			fname = Path.basename(p, Path.extname(p));
			items.push({
				fullname: p,
				filename: Path.basename(p),
				name: fname,
				zip: fname + '.7zip',
				txt: fname + '.txt'
			});
		});
		if (!items || !items.length) return;
		items.forEach(_getHash);
	},

	_init = function (params) {
		_loader = new Msg.loading();
		params.path.split(' ').forEach(_getFiles);
		_loader.stop();
	},


args = new Args('Napis', '1.0', 'Download subtitles from napiprojekt');
args.add({ name: 'path', desc: 'a list of file or folder names separated by space\npass * to read all files in current location', required: true });
if (args.parse()) _init(args.params);
else args.help();
