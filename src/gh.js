'use strict';

var Args = require('arg-parser');
var Msg = require('node-msg');
var Open = require('open');
var Path = require('path');
var FS = require('fs');
var args;


function getCfgPath(folder) {
	var path = Path.join(folder, './.git/');
	var exist = FS.existsSync(path);
	if (!exist) {
		var up = Path.join(folder, '..');
		if (FS.existsSync(up) && up !== folder) return getCfgPath(up);
		else return '';
	}
	return path;
}

function getRepoUrl(params) {
	var cfg = FS.readFileSync(Path.join(params.cfgPath, '/config'), 'utf8');
	var lines = cfg.split(/\r?\n/), i = 0, line;
	for (; line = lines[i]; i++) {
		if (line.indexOf('[remote ') === -1) continue;
		line = 'https://' + lines[i + 1]
				.trim()
				.replace(/^url\s?=\s?/, '')
				.replace(/^https?:\/\//, '')
				.replace(/(^git@)|(\.git$)/g, '')
				.replace(/:/g, '/');
		break;
	}
	return line;
}

function getBranch(params) {
	var cfg = FS.readFileSync(Path.join(params.cfgPath, '/HEAD'), 'utf8');
	return cfg && cfg.trim().replace(/^ref: refs\/heads\//, '');
}

function getFolder(params) {
	var gitFolder = Path.join(params.cfgPath, '..');
	return '/' + Path.relative(gitFolder, params.pwd).replace(/\\/g, '/');
}


function init(params) {
	params.pwd = process.cwd();
	params.cfgPath = getCfgPath(params.pwd);
	if (!params.cfgPath) return Msg.error('Not a git repo!');
	params.repoUrl = getRepoUrl(params);
	params.branch = getBranch(params);
	params.folder = getFolder(params);

	var url = params.repoUrl;
	if (params.param) {
		// https://github.wdf.sap.corp/Norman/UserResearch/tree/master/client
		if (params.param === '/') url += '/tree/' + params.branch;
		else if (params.param === '.') url += '/tree/' + params.branch + params.folder;

		// https://github.wdf.sap.corp/Norman/UserResearch/issues/2
		else url += '/issues/' + params.param.replace(/\#/g, '');

		Open(url);
	}

	Msg.log(Msg.grey('branch: ') + Msg.cyan(params.branch));
	Msg.log(Msg.grey('  repo: ') + Msg.cyan(params.repoUrl));
}



args = new Args('GH', '1.0', 'Show current repo on GitHub',
	'Example:\ngh 1234 - open issue page for the current repo');

args.add({ name: 'param', desc: 'Optional parameter to open. Can be:' +
	'\n/ - open GH in the root folder of the current repo' +
	'\n. - open GH in the current folder of the current repo' +
	'\nid - open issue/PR for the current repo' });

if (args.parse()) init(args.params);
