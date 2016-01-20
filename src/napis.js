'use strict';

const Args = require('arg-parser');
const Msg = require('node-msg');
const FS = require('fs');
const BUF = require('buffer').Buffer;
const CRYPT = require('crypto');
const HTTP = require('http');
const EXE = require('child_process').exec;
const Path = require('path');

const isWin = /^win/.test(process.platform);
const videos = [ '.avi', '.mpg', '.mpeg', '.mp4', '.mov', '.wmv', '.mkv' ];


/*** HELPERS **************************************************************************************/
/**
 * Find files (full paths) matching videos extensions in the given folder (not recursive)
 * @param   {string}  dir  folder name
 * @return  {array}        array of files (paths & names)
 */
function getFilesInFolder (dir) {
	return FS.readdirSync(dir)
		.filter(f => {
			return FS.statSync(Path.resolve(dir, f)).isFile() &&
				videos.indexOf(Path.extname(f)) > -1;
		})
		.map(f => dir + Path.sep + f);
}

function _f (z) {
	let b = [], j, i = 0, t, v, a, m;
	let idx = [0xe, 0x3, 0x6, 0x8, 0x2];
	let mul = [2, 2, 5, 4, 3];
	let add = [0, 0xd, 0x10, 0xb, 0x5];
	for (; i < 5; i++) {
		a = add[i];
		m = mul[i];
		j = idx[i];
		t = a + parseInt(z[j], 16);
		v = parseInt(z.substring(t, t + 2), 16);
		b.push((v * m).toString(16).substr(-1));
	}
	return b.join('');
}

function removeFile(f) {
	try { FS.unlinkSync(f); }
	catch(e) { } /*eslint no-empty: 0*/
}
/*** HELPERS **************************************************************************************/


function printResult (items) {
	items.forEach(item => {
		if (item.found) Msg.log(Msg.green(item.lang) + ' ' + Msg.white(item.filename));
		else Msg.log(Msg.yellow('-- ') + Msg.white(item.filename));
	});
}


function unzip (item) {
	let cmd = (isWin ? '"c:\\Program Files\\7-Zip\\7z.exe"' : '7z')  +
		' e -y -so -bd -piBlm8NTigvru0Jr0 "' + item.zip + '" > "' + item.txt + '"';
	return new Promise(resolve => {
		EXE(cmd, function (error, stdout, stderr) {
			if (error) {
				item.error = stderr;
				removeFile(item.txt);
			}
			removeFile(item.zip);
			resolve(item);
		});
	});
}

function downloadSubs (item) {
	if (item.found) return Promise.resolve(item);

	if (!item.lang) item.lang = 'PL';
	else if (item.lang === 'PL') item.lang = 'EN';
	else if (item.lang === 'EN') return Promise.resolve(item);

	let options = {
		host: 'napiprojekt.pl',
		port: '80',
		path: '/unit_napisy/dl.php?v=other&kolejka=false&nick=&pass=&napios=nt&l=' +
			item.lang + '&f=' + item.hash + '&t=' + _f(item.hash)
			// '&f=99656e9af148e5b1fdb065c07c35e110&t=c0f4a' // success test
	};

	return new Promise(resolve => {
		HTTP.request(options, response => {
			let file = FS.createWriteStream(item.zip, { 'flags': 'a' });
			let found = null;
			response.on('data', chunk => {
				if (chunk.toString() === 'NPc0') found = false;
				else file.write(chunk, 'binary');
			});
			response.on('end', () => file.end());
			file.on('finish', () => {
				item.found = (found !== false);
				if (found === false) removeFile(item.zip);
				return resolve(item);
			});
		})
		.on('error', (e) => {
			item.error = e;
			resolve(item);
		})
		.end();
	});
}


/**
 * Calculate special hash for a file
 */
function getHash (item) {
	return new Promise((resolve, reject) => {
		FS.open(item.fullname, 'r', (status, fd) => {
			if (status) return reject(status.message);

			let buffer = new BUF(10485760);
			let num = FS.readSync(fd, buffer, 0, 10485760, 0);
			let ft = buffer.toString('binary', 0, num);
			let md5 = CRYPT.createHash('md5');

			md5.update(ft);
			item.hash = md5.digest('hex');

			resolve(item);
		});
	});
}


/**
 * Build files array
 */
function getFiles (path) {
	if (path === '') path = '.';								// current dir
	path = Path.normalize(Path.resolve(path));

	return new Promise(resolve => {
		if (FS.statSync(path).isFile()) path = [path];				// just single file
		else path = getFilesInFolder(path);							// files in given dir

		let files = path.map(p => {
			let fname = Path.basename(p, Path.extname(p));
			return {
				fullname: p,										// d:\video.avi
				filename: Path.basename(p),							// video.avi
				name: fname,										// video
				zip: fname + '.7zip',								// video.7zip
				txt: fname + '.txt'									// video.txt
			};
		});
		resolve(files);
	});
}


function _init (pth) {
	getFiles(pth)
		.then(files => {
			let all = files.map(f => getHash(f)
				.then(downloadSubs)
				.then(downloadSubs)
				.then(unzip));
			return Promise.all(all);
		})
		.then(printResult)
		.catch(() => {
			Msg.log(Msg.yellow('No video files found!'));
		});
}


const args = new Args('Napis', '1.0', 'Download subtitles from napiprojekt');
args.add({
	name: 'path',
	desc: `a space separated list of file or folder names
		if empty - all video files in current location`
});
if (args.parse()) _init(args.params.path || '');
