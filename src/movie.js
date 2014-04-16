var Args = require('arg-parser'), args,
	Msg = require('node-msg'),
	Cheerio = require('cheerio'),
	zlib = require('zlib'),
	HTTP = require('http'),
	_cln = [ '\\w264', 'mp3', 'xvid', 'divx', 'aac', 'ac3', '~', '[\\s|-]rip', 'download', 'dubbed',
		'juggs', 'prisak', 'rajonboy', 'YIFY', 'tamil', 'ddhrg', 'team', 'mafiaking', 'hon3y', 'publichd', 'unrated',
		'truefrench', 'carpediem', 'maniacs', 'd3si', 'sample', 'dts', 'torrent', 'art3mis', 'french', 'akatsuki', 'utt',
		'(\\d{3,4}p)', '(\\d+mb)', '([x|\\d]+cd)', '\\s\\d', 'brrip', 'dvd(scr(n)?)?(rip)?', 'blu\\-?ray', 'bdrip',
		'h3ll2p4y', 'italian', 't4p3', 'vision', 'venum', 'rarbg', '(e\\-)?subs', 'hellraz0r', 'jyk', 'mms', 'titan',
		'k3ly', 'presents00', 'destroy', 'hd', 'hc', 'rip', 'aqos', 'web', 'readnfo', 'subtitles', 'dus',
		'web\\-?dl', '(br|hd)rip', 'hdcam(rip)?', 'r5', 'r6', 'cam', 'sumo', 'webrip', 'ntsc'
	],

	_year = function (str) { return (/(19|20)(\d{2})/).test(str) ? str.replace(/.*(19|20)(\d{2}).*/, '$1$2') : '?'; },
	_age = function (str) { return str.replace(/^(\d+)(.+)(d|h)(\w+s?)$/, '$1$3'); },

	_quality = function (str, rate) {
		var q = {};
		if ((/blu\-?ray?/ig).test(str)) q = { name: 'BluRay', rate: 6 };
		else if ((/dvdrip(rip)?/ig).test(str)) q = { name: 'DVDr', rate: 5 };
		else if ((/brrip/ig).test(str)) q = { name: 'BR', rate: 4 };
		else if ((/hdrip/ig).test(str)) q = { name: 'HD', rate: 4 };
		else if ((/dvdscr(n)?(rip)?/ig).test(str)) q = { name: 'DVDScr', rate: 3 };
		else if ((/bdrip/ig).test(str)) q = { name: 'BD', rate: 3 };
		else if ((/r5/ig).test(str)) q = { name: 'R5', rate: 3 };
		else if ((/web\-?(dl|rip)/ig).test(str)) q = { name: 'Web', rate: 3 };
		else if ((/r6/ig).test(str)) q = { name: 'R6', rate: 2 };
		else if ((/ts(rip)?/ig).test(str)) q = { name: 'TS', rate: 2 };
		else if ((/cam(rip)?/ig).test(str)) q = { name: 'Cam', rate: 1 };
		else q = { name: '?', rate: 0 };
		return q[rate ? 'rate' : 'name'];
	},

	_name = function (str) {
		str = str.replace(/\./g, ' ');								// dots to spaces
		str = str.replace(/\(?(19|20)(\d{2})\)?/g, '');				// remove year
		_cln.forEach(function (p) { str = str.replace(new RegExp(p, 'ig'), ''); });
		str = str.replace(/\[.+\]/g, '').replace(/\{.+\}/g, '');	// content in brackets
		str = str.replace(/\s?\-+\s?/g, ' ');						// remove dashes
		str = str.replace(/hindi/ig, '[hindi]');
		return str.replace(/\s{2,}/g, ' ').trim();
	},

	_getRow = function (node) {
		var cells = node.find('td'), name = cells.find('.cellMainLink').text();
		if ((/hindi|punjabi|indian|malay/ig).test(name)) return;
		return [ _name(name), _quality(name), _year(name), _age(cells.eq(3).text()) ];
	},

	_parseResponse = function (html) {
		var $ = Cheerio.load(html), table = [ ['Name', 'Rip', 'Year', 'Age'] ], row;
		$('#wrapperInner .mainpart .doublecelltable table').first().find('tr').each(function () {
			if (!$(this).hasClass('firstr')) {
				row = _getRow($(this));
				if (row) table.push(row);
			}
		});
		Msg.table(table);
	},

	_init = function () {
		var resp = '', load = new Msg.loading(), gunzip = zlib.createGunzip();
		HTTP.get('http://kickass.to').on('response', function (res) {
			load.stop();
			gunzip.on('data', function (data) { resp += data.toString(); });
			gunzip.on('end', function () { _parseResponse(resp); });
			res.pipe(gunzip);
		});
	};

args = new Args('KickassChecker', '1.0', 'Check for new kickass torrents');
if (args.parse()) _init(args.params);
