// jshint latedef: false
var Args    = require('arg-parser'), args,
	Msg     = require('node-msg'),
	Cheerio = require('cheerio'),
	_params = {
		priceFrom: 200000,
		priceTo: 280000,
		propertyType: 'semi-detached',
		sortBy: 'date',
		sortType: 'd'
	},
	_loader = null,
	_table = [],
	_total = 0,

	_ucWords = function (str) { return str.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); },
	_getText = function (node, selector) { return node.find(selector).text().trim(); },
	_getName = function (node, selector) { return _ucWords(_getText(node, selector).split('\n')[0].trim().replace(', Co. Dublin', '').replace(', Lucan', '')); },
	_getDesc = function (node, selector) { return _getText(node, selector).split('|').map(function (s) { return s.replace(/ house/i, '').trim(); }).join(', ').trim(); },
	_getPrice = function (node, selector) { return _getText(node, selector).trim().replace(/\n/g, '').replace(/(.*€)(\d+,\d+)/, '$2'); },
	_getDate = function (node, selector) {
		var d = _getText(node, selector).replace('Date Entered: ', ''),
			date = d.replace(/(\d{1,2}\/\d{1,2}\/\d{4}).*/, '$1').split('/'),
			rel = d.replace(/.+\((.+)\)/, '$1');
		date[0] = ('0' + date[0]).substr(-2);
		date[1] = ('0' + date[1]).substr(-2);
		return { date: date.reverse().join('-'), rel: rel };
	},
	_unwanted = function (name) {
		var unwanted = [ 'foxborough', 'foxford', 'earlsfort', 'liffey', 'ashberry', 'finns', 'elm' ];
		return (new RegExp(unwanted.join('|'), 'ig')).test(name);
	},

	_formatResponse = function (html, page) {
		var $ = Cheerio.load(html), boxes = $('#sr_content .box'), name, price, date, desc,
			reg = _params.propertyType ? new RegExp(_params.propertyType, 'i') : null;

		if (page === 0) {
			_total = $('#content .tabs-area .tab-content .section strong').text().trim();
			_total = _total.replace('Found ', '').replace(' properties.', '');
			_total = parseInt(_total, 10);
		}
		else if (!boxes.length) return _printTable();

		boxes.each(function (i, node) {
			node = $(node);
			name  = _getName(node, 'h2 a');
			price = _getPrice(node, '.text-block .price');
			desc  = _getDesc(node, '.text-block .info');
			date  = _getDate(node, '.text-block .date_entered');
			if (!name || !price) return;
			if (reg && !reg.test(desc)) { _total--; return; }
			if (_unwanted(name)) { _total--; return; }

			if (name.length > 30) name = name.substr(0, 27) + '...';
			desc = desc.replace(/(semi\-detached, )(\d{1})( beds?,? ?)(\d{1})?( baths?)?/i, function (s0, sem, bed, s1, bth) {
				return '(' + bed + (bth ? '/' + bth : '') + ')';
			});

			_table.push({ name: name, price: price, desc: desc, date: date });
		});
		_load(page + 1);
	},

	_printTable = function () {
		_loader.stop(_total);
		_table.forEach(function (el) {
			Msg.log(Msg.grey(el.date.date) + ' ' + Msg.cyan(el.price) + ' ' + Msg.white(el.name) + '  ' + Msg.grey(el.desc));
		});
	},

	_url = function (page) {
		return 'http://www.daft.ie/dublin-city/houses-for-sale/lucan?s[photos]=1&s[pt_id]=1&s[a_id_transport]=260' +
			'&s[new]=2&s[advanced]=1&s[refreshmap]=1&s[mnb]=3' +
			'&offset=' + (page * 10) +
			'&s[mnp]=' + _params.priceFrom +
			'&s[mxp]=' + _params.priceTo +
			'&s[sort_by]=' + _params.sortBy +
			'&s[sort_type]=' + _params.sortType;
	},

	_load = function (page) {
		var resp = '';
		require('http').request(_url(page), function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () { _formatResponse(resp, page); });
		}).on('error', function (e) { _loader.stop(); Msg.error(e.message); }).end();
	};

args = new Args('Daft', '1.0', 'Fetch daft search results');
if (args.parse()) {
	// args.params
	_loader = new Msg.loading((new Date()).toISOString().substr(0, 10) + ', total: ');
	_load(0);
}