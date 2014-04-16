var Args = require('arg-parser'), args,
	Http = require('http'),
	Msg = require('node-msg'),
	Cheerio = require('cheerio'),

	_trim = function (str, toTrim) {
		toTrim = toTrim || '\\s';
		return str.replace(new RegExp('^' + toTrim + '+'), '').replace(new RegExp(toTrim + '+$'), '');
	},
	_getCell = function (cl, i) { return _trim(_trim(cl.eq(i).text(), ',')); },
	_getRow = function (cl) {
		var time = _getCell(cl, 1) + ' ' + _getCell(cl, 2).slice(0, -3),
			desc = _getCell(cl, 3), lim = 33,
			loc = _getCell(cl, 0);

		if (!args.params.full) {
			loc = loc.replace(/Irlandia/, 'IE').replace(/Polska/, 'PL').replace(/Niemcy/, 'DE').replace(/Wielka Brytania/, 'UK');
			loc = loc.replace(/(Dublin )(\d+)/g, 'D$2');
			if (desc.length > lim) desc = desc.substr(0, lim - 3) + '...';
		}
		return [ time, loc, desc ];
	},

	_parseResponse = function (html) {
		var $ = Cheerio.load(html), table = [], header = [];
		$('#result-box table tr').each(function (i) {
			if (i === 0) header = _getRow($(this).find('td'));
			else table.push(_getRow($(this).find('td')));
		});
		table.reverse().unshift(header);
		Msg.table(table);
	},

	_check = function () {
		var chunk = '',
			params = 'id=21899276460',
			settings = { host: 'www.eurospedycja.com', path: '/stan_paczki.php', method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': params.length }
			},
			req = Http.request(settings);
		req.write(params);
		req.on('response', function (res) {
			res.on('data', function (ch) { chunk += ch; });
			res.on('end', function () { _parseResponse(chunk.trim()); });
		}).on('error', Msg.error).end();
	};

args = new Args('Paka checker', '2.0', 'Check package status');
args.add({ name: 'full', desc: 'show full text', switches: ['-f', '--full'] });
if (args.parse()) _check(args.params);
