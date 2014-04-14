//zip pass: iBlm8NTigvru0Jr0
//http://napiprojekt.pl/unit_napisy/dl.php?l=PL&f=99656e9af148e5b1fdb065c07c35e110&t=c0f4a&v=other&kolejka=false&nick=&pass=&napios=nt

var FS = require('fs'),
	BUF = require('buffer').Buffer,
	CRYPT = require('crypto'),
	HTTP = require('http'),
	EXE = require('child_process').exec,
	FileName = '',

getFileName = function (filename){ var fname=(filename||''); return fname.substring(0, fname.lastIndexOf('.')); },

f = function(z){
	var idx = [0xe, 0x3, 0x6, 0x8, 0x2], mul = [2, 2, 5, 4, 3], add = [0, 0xd, 0x10, 0xb, 0x5], b = [], j, i = 0, t, v;
	for (; i < 5; i++){
		a = add[i]; m = mul[i]; j = idx[i];
		t = a + parseInt(z[j], 16);
		v = parseInt(z.substring(t, t+2), 16);
		b.push((v*m).toString(16).substr(-1));
	}
	return b.join('');
},

readFile = function(fname){
	FS.open(fname, 'r', function(status, fd) {
		if (status){ console.log(status.message); return; }
		var buffer = new BUF(10485760),
			md5 = CRYPT.createHash('md5'),
			num = FS.readSync(fd, buffer, 0, 10485760, 0),
			ft = buffer.toString("binary", 0, num);
		md5.update(ft);
		readUrl(md5.digest('hex'));
	});
},

//str = "http://napiprojekt.pl/unit_napisy/dl.php?l=PL&f="+hex+"&t="+f(hex)+"&v=other&kolejka=false&nick=&pass=&napios=nt"
//http://napiprojekt.pl/unit_napisy/dl.php?l=PL&f=99656e9af148e5b1fdb065c07c35e110&t=c0f4a&v=other&kolejka=false&nick=&pass=&napios=nt
readUrl = function(hex){
	//var str = "http://napiprojekt.pl/unit_napisy/dl.php?l=PL&f="+hex+"&t="+f(hex)+"&v=other&kolejka=false&nick=&pass=&napios=nt"; return console.log(str);
	var options = {
			host: 'napiprojekt.pl', port: '80',
			path: '/unit_napisy/dl.php?l=PL&v=other&kolejka=false&nick=&pass=&napios=nt'+
			//'&f=99656e9af148e5b1fdb065c07c35e110'+'&t=c0f4a' // success test
			'&f=' + hex + '&t=' + f(hex)
		},
		req = HTTP.request(options, function(response) {
			var file = FS.createWriteStream(FileName + '.7z', {'flags': 'a'});
			response.on('data', function(chunk){ file.write(chunk, 'binary'); });
			response.on('end', function(){ file.end(); unzip(); });
		});
	req.end();
},

get7zipError = function(out){
	var msg = '';
	out.split('\r\n').map(function(line){ if (line.indexOf('Error:') > -1) msg = line.substr(7); });
	console.error(msg);
	return false;
},

get7zipSuccess = function(out){
	var msg = '';
	out.split('\r\n').map(function(line){ if (line.indexOf('Ok') > -1) msg = 'Success'; });
	console.log(msg);
	return true;
},

unzip = function (){
	var zipName = FileName + '.7z', txtName = FileName + '.txt',
		cmd = '7z e -y -so -bd -piBlm8NTigvru0Jr0 ' + zipName + ' > ' + txtName;
		// cmd = '"c:\\Program Files\\7-Zip\\7z.exe" x -y -so -bd -piBlm8NTigvru0Jr0 ' + zipName + ' > ' + txtName;

	EXE(cmd, function (error, stdout, stderr) {
		// FS.unlink(zipName);
		if (error != null) { FS.unlink(txtName); return get7zipError(stderr); }
		else return get7zipSuccess(stderr);
	});
};

if (process.argv && process.argv.length > 2){
	FileName = getFileName(process.argv[2]);
	readFile(process.argv[2]);
}
else console.error('Provide file name');
