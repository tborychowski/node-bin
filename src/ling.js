var Args = require('arg-parser'), args,
	Msg = require('node-msg');

function formatResponse(arg, json) {
	// Msg.log(arg.phrase + Msg.grey(' [' + json.src + ']\n'));
	if (json.sentences) {
		json.sentences.forEach(function (item) {
			Msg.log(
				Msg.grey('' + json.src + ' ') +
				arg.phrase +
				' - ' +	// ' → ' +
				Msg.grey('' + arg.to + ' ') +
				Msg.paint(item.trans, 'cyan bold')
			);
		});
	}

	if (json.dict) {
		// Msg.print('\nDICTIONARY:', 'grey');
		Msg.log('');
		json.dict.forEach(function (item) {
			Msg.log('' + arg.phrase + ' ' + Msg.grey(item.pos) + ' ' + item.terms.join(', '));
		});
	}
}

function translate(arg) {
	var resp = '',
		url = 'http://translate.google.com/translate_a/t?client=p&hl=en&sc=2&ie=UTF-8&oe=UTF-8&oc=1&otf=1&ssel=0&tsel=0' +
			'&sl=' + arg.from + '&psl=' + arg.from + '&tl=' + arg.to + '&uptl=' + arg.to + '&q=' + arg.phrase;

	require('http').request(url, function (res) {
		res.on('data', function (chunk) { resp += chunk; });
		res.on('end', function () {
			resp = JSON.parse(resp);
			if (arg.to === resp.src) {
				arg.to = (arg.to === 'pl' ? 'en' : 'pl');
				return translate(arg);
			}
			formatResponse(arg, resp);
		});
	}).on('error', function (e) { Msg.error(e.message); }).end();
}


args = new Args('Node Translator', '1.0', 'Translate a word or a phrase', 'LANG is a language code, e.g.: en, pl, es, fr, ru');
args.add({ name: 'from', desc: 'enforce source language', switches: ['-f', '-from', '--from'], value: 'lang', default: 'auto', required: true });
args.add({ name: 'to', desc: 'enforce target language', switches: ['-t', '-to', '--to'], value: 'lang', default: 'pl', required: true });
args.add({ name: 'phrase', desc: 'a word or a phrase to translate', required: true });

if (args.parse()) translate(args.params);
