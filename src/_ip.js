// jshint loopfunc: true, latedef: false
var
	OS = require('os'),
	Msg = require('node-msg'),
	HTTP = require('http'),
	ifaces = OS.networkInterfaces(),
	extIpServ = 'icanhazip.com', // or: api.exip.org/?call=ip, or: checkip.dyndns.org
	externalIP = '',

	spaces = function (n, chr) { if (n < 0) return ''; return new Array(n || 1).join(chr || ' '); },
	formatIp = function (ip) { return Msg.cyan(spaces(15 - ip.length) + ip); },
	getMacs = function () {
		//ifconfig | grep HWaddr
		require('child_process').exec('getmac /V /NH /FO CSV', function (er, stdout) {
			if (er !== null) return Msg.error(er);
			writeIPs(parseMacs(stdout));
		});
	},

	parseMacs = function (str) {
		if (!str || !str.length) return {};
		var macs = {};
		str.split('\n').forEach(function (row) {
			row = row.trim().slice(1, -1).split('","');
			if (row[0]) macs[row[0]] = row[2];
		});
		return macs;
	},

	writeIPs = function (macs) {
		var mac, dev;
		console.log(ifaces);
		for (dev in ifaces) {
			ifaces[dev].forEach(function (details) {
				if (details.family !== 'IPv4' || details.internal) return;
				mac = Msg.yellow(macs[dev] ? macs[dev] : '');
				Msg.log(formatIp(details.address) + ' :: ' + Msg.grey(dev) + ' :: ' + mac);
			});
		}
	};


getMacs();

HTTP.request({ hostname: extIpServ, agent: false }, function (res) {
	res.on('data', function (chunk) { externalIP += chunk; });
	res.on('end', function () { Msg.log(formatIp(externalIP.trim()) + ' :: ' + Msg.grey('External IP')); });
}).on('error', function (e) { Msg.log('Got error: ' + e.message); }).end();
