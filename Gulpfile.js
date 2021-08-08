const { series, src, dest, watch } = require('gulp');
const insert = require('gulp-insert');


function build () {
	return src('./src/*.js')
		.pipe(insert.prepend('#!/usr/bin/env node\n'))
		.pipe(dest('./dist'));
}

function watchTask () {
	watch('./src/*.js', build);
}

exports.watch = watchTask;
exports.default = build;
