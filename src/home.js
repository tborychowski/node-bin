/*global require */
// jshint -W084
var Args    = require('arg-parser'), args,
	Msg     = require('node-msg'),
	Cheerio = require('cheerio'),
	_params = {
		priceFrom: 175000,
		priceTo: 250000,
		propertyType: 'semi-detached',
		sortBy: 'date',
		sortType: 'd'
	},
	_loader = null,
	_table = [],
	_total = 0,

	_ucWords = function (str) { return str.toLowerCase().replace(/\b[a-z]/g, function(c) { return c.toUpperCase(); }); },
	_getText = function (node, selector) { return node.find(selector).text().trim(); },
	_getPrice = function (node, selector) { return _getText(node, selector).trim().replace(/\n/g, '').replace(/(.*€)(\d+,\d+)/, '$2'); },
	_getRating = function (node, selector) { return node.find(selector).attr('alt'); },
	_getName = function (node, selector) {
		var name = _getText(node, selector).split('\n')[0].trim()
			.replace(/Dublin\s?(west|south|north)?/i, '')
			.replace('Lucan', '')
			.replace('County', '')
			.replace(/Co.?/, '')
			.replace(/[,\s]+$/, '');

		return _ucWords(name);
	},
	_getDesc = function (node, selector) {
		return _getText(node, selector).trim()
			.replace(/Semi\-Detached/i, '')
			.replace(/House/i, '')
			.replace(/For Sale/i, '')
			.replace(/(\d{2,4}\sft²)/, '')
			.replace(/\//g, '')
			.replace(/\s+/g, ' ');
	},

	_unwanted = function (name) {
		name = name.toLowerCase();
		if (name.indexOf('foxborough') > -1) return true;
		return false;
	},

	_formatResponse = function (html, page) {
		var $ = Cheerio.load(html),
			boxes = $('#results .resultBody'),
			nextPageBtn = $('#main .pager .next'),
			isLast = (!nextPageBtn.length || nextPageBtn.hasClass('disabled')),
			name, desc, date, price, rating;

		_total += boxes.length;

		boxes.each(function (i, node) {
			node = $(node);
			name = _getName(node, '.address .ResidentialForSale');
			rating = _getRating(node, '.address .listing');
			desc = _getDesc(node, '.descriptionTitle .floatLeft');
			price = _getPrice(node, '.price');
			if (_unwanted(name)) { _total--; return; }
			_table.push({ name: name, price: price, desc: desc, rating: rating });
		});

		if (isLast) return _printTable();
		_load(page + 1);
	},


	_printTable = function () {
		_loader.stop(_total);
		_table.forEach(function (el) {
			Msg.log(Msg.cyan(el.price) + ' ' + Msg.yellow(el.name) + Msg.grey(' ' + el.rating + ', ') + Msg.grey(el.desc));
		});
	},

	_url = function (page) {
		return 'http://www.myhome.ie/residential/dublin-county/semi-detached-house-for-sale-in-lucan?' +
			'MinEnergyRating=D1&minbeds=3&maxbeds=3&page=' + page +
			'&minprice=' + _params.priceFrom + '&maxprice=' + _params.priceTo;
	},

	_load = function (page) {
		var resp = '';
		require('http').request(_url(page), function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () { _formatResponse(resp, page); });
		}).on('error', function (e) { load.stop(); Msg.error(e.message); }).end();
	};

args = Args('home.ie', '1.0', 'Fetch home.ie search results');
if (args.parse()) {
	_loader = new Msg.loading((new Date()).toISOString().substr(0, 10) + ', total: ');
	_load(1);
}