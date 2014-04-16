var Args       = require('arg-parser'), args,
	Msg        = require('node-msg'),
	_          = require('underscore'),
	_select    = require('soupselect').select,
	HTMLParser = require('htmlparser'),

	_unescapeHTML = function (str) {
		if (str === null) return '';
		var escapeChars = { lt: '<', gt: '>', quot: '"', amp: '&', apos: '\'' };
		return String(str).replace(/\&([^;]+);/g, function (entity, entityCode) {
			var match;
			if (entityCode in escapeChars) return escapeChars[entityCode];
			if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) return String.fromCharCode(parseInt(match[1], 16));
			if (match = entityCode.match(/^#(\d+)$/)) return String.fromCharCode(~~match[1]);
			return entity;
		});
	},
	_ucWords = function (str) { return str.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); },
	_urlFromQuery = function (str, lang) {
		return 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(_ucWords(str).replace(/[ ]/g, '_'));
	},
	parseHTML = function (html, selector) {
		var handler = new HTMLParser.DefaultHandler(function () {}, { ignoreWhitespace: true }),
			parser = new HTMLParser.Parser(handler);
		parser.parseComplete(html);
		return _select(handler.dom, selector);
	},
	_childrenOfType = function (root, nodeType) {
		var results = [];
		if (nodeType === (root ? root.type : undefined)) return [root];
		if (root && root.children && root.children.length) {
			root.children.forEach(function (child) { results.push(_childrenOfType(child, nodeType)); });
		}
		return results;
	},
	_findBestParagraph = function (paragraphs) {
		if (paragraphs.length === 0) return null;
		var text = '', childs = _.flatten(_childrenOfType(paragraphs[0], 'text'));
		childs.forEach(function (child) { text += child.data; });
		text = text.replace(/\s*\([^()]*?\)/g, '').replace(/\s*\([^()]*?\)/g, '').replace(/\s{2,}/g, ' ').replace(/\[[\d\s]+\]/g, '');
		text = _unescapeHTML(text);
		if (text.replace(/[^a-zA-Z]/g, '').length < 35) return _findBestParagraph(paragraphs.slice(1));
		return text;
	},
	_init = function (params) {
		var resp = '',
			url = _urlFromQuery(params.phrase, params.lang),
			load = new Msg.loading(Msg.paint(_ucWords(params.phrase), 'cyan bold'));

		require('https').request(url, function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () {
				load.stop('\n');
				Msg.log(Msg.grey(url) + '\n');
				if (/does not have an article/.test(resp)) return Msg.error('Article not found');
				Msg.log(_findBestParagraph(parseHTML(resp, 'p')));
			});
		}).on('error', function (e) { Msg.error(e.message); }).end();
	};

args = new Args('Wiki', '1.0', 'Fetch wikipedia article');
args.add({ name: 'phrase', desc: 'a word or a phrase', required: true });
args.add({ name: 'lang', desc: 'target language', switches: ['-l', '--lang'], value: 'lang', default: 'en' });
if (args.parse()) _init(args.params);
