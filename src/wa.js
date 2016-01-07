var Args = require('arg-parser'), args,
	Msg  = require('node-msg'),
	XML = require('xml2js').parseString,
	_url = 'http://api.wolframalpha.com/v2/query?primary=true&appid=35EK93-QJX849VTRA&format=plaintext&input=',

	/**
	 * Filter out additional sections
	 * @param  {string}  title    title of the section
	 * @return {Boolean}          true if is additional; false if needed
	 */
	_isAdditional = function (title) {			// jshint -W084
		var i = 0, s,
			sections = [ 'Wikipedia', 'Corresponding', 'Comparison',
				'Additional', 'Interpretations', 'American pronunciation',
				'Other notable uses', 'Notable books', 'map', 'plot',
				'Narrower terms', 'Broader terms', 'Translations', 'Word frequency',
				'Crossword puzzle', 'Scrabble', 'Rhymes', 'Anagrams', 'Hyphenation',
				'Exchange history', 'Frequency allocation', 'Electromagnetic frequency range'
			];

		if (title === 'Image' || title === 'Timeline') return true;
		for (; s = sections[i++] ;) if (title.indexOf(s) > -1) return true;
		return false;
	},

	_parseResponse = function (err, res) {
		if (!res || !res.queryresult || !res.queryresult.pod || !res.queryresult.pod.length) return;
		res.queryresult.pod.forEach(function (pod, i) {
			var title = pod.$.title, pods = [];

			if (_isAdditional(title)) return;
			if (title === 'Input interpretation') return Msg.print('WOLFRAM: ' + pod.subpod[0].plaintext, 'cyan bold');

			pod.subpod.forEach(function (sub) {
				if (!sub.$.title && !sub.plaintext.join('')) return;
				pods.push((sub.$.title ? '(' + sub.$.title + ') ' : '') + sub.plaintext);
			});

			if (!pods.length) return;
			Msg.print('\n' + title, 'yellow');
			Msg.log(pods.join('\n'));
		});
	},

	_init = function (params) {
		var resp = '', load = new Msg.loading();
		require('http').request(_url + encodeURIComponent(params.phrase), function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () {
				load.stop();
				XML(resp, _parseResponse);
			});
		}).on('error', Msg.error).end();
	};


args = Args('Wolfram', '1.0', 'Wolfram Alpha');
args.add({ name: 'phrase', desc: 'a word or a phrase', required: true });
if (args.parse()) _init(args.params);
