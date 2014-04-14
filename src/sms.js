/*global require, console, __dirname */

var Msg = require('node-msg'),
	Args = require('arg-parser'), args,
	FS = require('fs'),
	HTTP = require('http'),
	Query = require('querystring').stringify,
	conf = FS.existsSync(__dirname + '/sms.json') ? require(__dirname + '/sms.json') : null,
	loader,

	msgOK = function (count, wasSent) {
		var msg = '';
		loader.stop(Msg.green('OK'));
		if (wasSent) msg += Msg.paint('\nMessage sent!', 'cyan');
		msg += Msg.grey('\nYou have ' + count + ' messages left.');
		console.log(msg);
	},
	noConfig = function () {
		Msg.error('No config file!');
		var sample = '{\n\t"email": "@gmail.com",\n\t"pass": "",\n\t"to" : {\n\t\t"me" : "085"\n\t}\n}';
		FS.writeFile(__dirname + '/sms.json', sample, function (err) {
			if (err) Msg.error(err);
			else console.log('A sample config file was created: sms.json');
		});
	},
	send = function (to, msg) {
		var resp = '', params = { email: conf.email, pass: conf.pass, to: to, msg: msg };
		if (conf.to[to]) params.to = conf.to[to];
		else if (!(/^08\d{8}$/).test(to)) return Msg.error('Incorrect recipient number');

		loader = new Msg.loading('Sending...', { animType: 'swirl' });
		HTTP.request('http://herhor.org/sms/send.php?' + Query(params), function (res) {
			res.on('data', function (chunk) { resp += chunk; });
			res.on('end', function () {
				var json = JSON.parse(resp.trim());
				if (json.result === 'success') msgOK(json.messagesLeft, msg && msg.length);
				else {
					loader.stop(Msg.red('ERROR'));
					Msg.error(json.msg);
				}
			});
		}).on('error', function (e) { Msg.error(e.message); }).end();
	};

if (!conf) return noConfig();

args = new Args('SMS Sender', '3.0', 'Send SMS to Meteor network', 'Run with no parameters to check how many free messages you have left.');
args.add({ name: 'to', desc: 'name of the contact from config or a number' });
args.add({ name: 'msg', desc: 'text message to send' });

if (args.parse()) send(args.params.to, args.params.msg);
