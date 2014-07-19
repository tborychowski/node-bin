var Args = require('arg-parser'), args,
	Msg  = require('node-msg'),
	Imap = require('imap'),
	FS = require('fs'),
	Path = require('path'),
	Crypto = require('crypto'),
	loader,

	_confFname = __dirname + Path.sep + Path.basename(__filename, '.js') + '.json',
	_conf = FS.existsSync(_confFname) ? require(_confFname) : null,


	/*** HELPERS ******************************************************************************************************/
	_encrypt = function (text, salt) {
		var cipher = Crypto.createCipher('aes-256-cbc', salt), crypted = cipher.update(text, 'utf8', 'hex');
		crypted += cipher.final('hex');
		return crypted;
	},

	_decrypt = function (text, salt) {
		var decipher = Crypto.createDecipher('aes-256-cbc', salt), dec = decipher.update(text, 'hex', 'utf8');
		try { dec += decipher.final('utf8'); }
		catch (e) {
			Msg.error('Cannot decrypt credentials. Are you using' + (salt === ' ' ? '' : ' correct') + ' SALT?');
			process.exit();
		}
		return dec;
	},

	_parseConfig = function (cfg, salt) {
		var acc = { l: '', p: '' }, l;
		for (l in cfg) {
			acc.p = _decrypt(cfg[l], salt || ' ');
			acc.l = _decrypt(l, salt || ' ');
		}
		return acc;
	},

	_showError = function (err) {
		if (loader) loader.stop();
		Msg.error(err);
	},

	_parseResponse = function (login, resp, params) {
		if (loader) loader.stop();
		if (params.short) return Msg.log(resp.unread);
		Msg.log(Msg.paint(resp.msg, 'cyan bold'));
		if (resp.messages) resp.messages.forEach(function (m) { Msg.log('- ' + m); });
		// Msg.print('\nTotal: ' + resp.total, 'grey bold');
		// if (resp.unread) Msg.print('Unread: ' + resp.unread, 'grey bold');
		process.exit();
	},
	/*** HELPERS ******************************************************************************************************/



	_add = function (details) {
		if (!details || details.length < 2) return Msg.error('Incorrect details format');
		var s = details[2] || ' ', l = _encrypt(details[0], s), p = _encrypt(details[1], s);
		FS.writeFile(_confFname, '{ "' + l + '": "' + p + '" }', function (err) {
			if (err) return Msg.error(err);
			Msg.log('Account details are stored in ' + _confFname);
		});
	},


	/**
	 * Checks gmail for unread messages
	 */
	_check = function (creds, params) {
		var msgs = {},
			successResult = {},
			imap = new Imap({ host: 'imap.gmail.com', port: 993, tls: true, tlsOptions: { rejectUnauthorized: false },
				user: creds.l, password: creds.p });

		if (!params.short) loader = new Msg.loading();
		imap.once('error', _showError);
		// imap.once('end', function () { console.log('Connection ended'); });
		imap.once('ready', function () {
			imap.openBox('INBOX', true, function (err, box) {
				if (err) throw err;

				successResult = box.messages;
				successResult.unread = 0;

				imap.search([ 'UNSEEN', ['SINCE', (new Date()).getFullYear() ] ], function (err, results) {
					if (!results || !results.length) {
						imap.end();
						successResult.msg = 'You have no unread messages!';
						return _parseResponse(creds.l, successResult, params);
					}

					var f = imap.fetch(results, { bodies: '' });
					// var f = imap.seq.fetch('1:3', { bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)', struct: true });
					f.on('message', function (msg, seqno) {
						successResult.unread ++;

						// var prefix = '(#' + seqno + ') ';
						msg.on('body', function (stream) {
							var buffer = '';
							stream.on('data', function (chunk) { buffer += chunk.toString('utf8'); });
							stream.once('end', function () {
								var header = Imap.parseHeader(buffer);
								// msgs['msg' + seqno] = header.subject + ' (from: ' + header.from + ')';
								msgs['msg' + seqno] = header.subject;
							});
						});
						// msg.once('attributes', function (attrs) { console.log(prefix + 'Attributes: %s', attrs); });
						// msg.once('end', function () { console.log(prefix + 'Finished'); });
					});
					f.once('error', _showError);
					f.once('end', function () {
						imap.end();
						var messages = [], m, count = 0;
						for (m in msgs) { messages.push(msgs[m]); count++; }
						successResult.messages = messages;
						successResult.msg = 'You have ' + count + ' unread message' + (count > 1 ? 's' : '') + '!';
						_parseResponse(creds.l, successResult, params);
					});
				});
			});
		});
		imap.connect();
	};


var detailsDesc = 'If -a switch is passed, details should be in format:\n' +
	'  LOGIN PASS SALT\nwhere:\n- LOGIN & PASS are gmail credentials\n- SALT is a passphrase used for encryption\n' +
	'If -a switch is not passed - to just check gmail\ndetails should only contain the SALT';

args = new Args('GmailChecker', '1.0', 'Check unread gmail messages');
args.add({ name: 'add', desc: 'Encrypt and ADD a gmail account to the config file', switches: ['-a', '--add'] });
args.add({ name: 'details', desc: detailsDesc });
args.add({ name: 'short', switches: [ '-s', '--short' ], desc: 'Just show the number of unread messages' });

if (args.parse()) {
	if (args.params.add) _add(args.params.details.split(' '));
	else if (!_conf) Msg.error('Config file missing. Please add account first!');
	else _check(_parseConfig(_conf, args.params.details), args.params);
}
