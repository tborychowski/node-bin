// jshint latedef: false
var Args    = require('arg-parser'), args,
	Msg     = require('node-msg'),
	_params = {
		priceFrom: 200000,
		priceTo: 280000,
		sortBy: 'date',
		sortType: 'd'
	},
	_loader = null,

	_ucWords = function (str) { return str.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); },
	_getName = function (name) {
		name = name.split('\n')[0].trim()
			.replace(/Dublin\s?(west|south|north)?/i, '')
			.replace('Lucan', '')
			.replace('County', '')
			.replace(/Co.?/, '')
			.replace(/[,\s]+$/, '');
		return _ucWords(name);
	},
	_getDesc = function (prop) {
		var desc = prop.PropertyType.replace(/House/i, '').trim() + ' (' + prop.Bedrooms;
		if (prop.Bathrooms) desc += '/' + prop.Bathrooms;
		desc += ')';
		if (prop.Size) desc += ', ' + prop.Size.toFixed() + 'm2';
		return desc;
	},
	_getPrice = function (price) {
		price = price.replace(/^[a-z\s:\€]+/i, '').replace(',', '');
		return (parseInt(price, 10) / 1000).toFixed() + 'k';
	},

	_getRating = function (rating) {
		rating = (rating || '--').toUpperCase();
		var r = rating.substr(0, 1).toLowerCase(),
			colors = { a: 'green', b: 'green', c: 'green bold', d: 'yellow', e: 'yellow bold', f: 'red bold' };
		return Msg.paint(rating, colors[r] ? colors[r] : 'red');
	},

	_unwanted = function (name) {
		var unwanted = [ 'foxborough', 'foxford', 'earlsfort', 'liffey', 'ashberry', 'finns', 'elm', 'adams' ];
		return (new RegExp(unwanted.join('|'), 'ig')).test(name);
	},



	_checkResponse = function (resp) {
		if (!resp || !resp.length) return Msg.error('Server response is empty!');
		json = JSON.parse(resp);
		if (!json) return Msg.error('Server response is incorrect!');
		if (!json.Properties || !json.Properties.length) return Msg.error('No results found!');
		return json;
	},


	_formatResponse = function (resp) {
		var json = _checkResponse(resp), name, rating, price, desc, table = [], total = 0;
		if (!json) return;

		total = json.ResultCount;

		json.Properties.forEach(function (prop) {
			if (_unwanted(prop.Address)) { total--; return; }

			name = _getName(prop.Address);
			rating = _getRating(prop.EnergyRating);
			price = _getPrice(prop.Price);
			desc = _getDesc(prop);			// e.g. semi-detached, (3/2)
			table.push({ name: name, price: price, desc: desc, rating: rating });
		});

		_loader.stop(total + '/' + json.ResultCount);
		table.forEach(function (el) {
			Msg.log(Msg.cyan(el.price) + ' ' + el.rating + Msg.white(' ' + el.name + ' ') + Msg.grey(el.desc));
		});
	},

	_url = function () {
		return 'http://www.myhome.ie/residential/dublin-county/property-for-sale-in-lucan?format=json&pageSize=50' +
			'&type=37|38' +
			// '&MinEnergyRating=D1' +
			'&minbeds=3&minprice=' + _params.priceFrom + '&maxprice=' + _params.priceTo;
	},

	_load = function () {
		var resp = '';
		require('http').request(_url(), function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () { _formatResponse(resp); });
		}).on('error', function (e) { _loader.stop(); Msg.error(e.message); }).end();
	};

args = new Args('home.ie', '2.0', 'Fetch home.ie search results');
if (args.parse()) {
	_loader = new Msg.loading((new Date()).toISOString().substr(0, 10) + ', total: ');
	_load();
}