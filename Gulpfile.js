var gulp = require('gulp'),
	gutil = require('gulp-util'),
	insert = require('gulp-insert'),
	isWin = /^win/.test(require('os').platform());

gulp.task('build', function () {
	var files = gulp.src('./src/*.js');
	if (!isWin) files = files.pipe(insert.prepend('#!/usr/bin/env node\n'));
	return files.pipe(gulp.dest('./dist'));
});

gulp.task('default', [ 'build' ]);

gulp.task('watch', function () {
	gulp.watch('./src/*.js',    [ 'build' ]);
});
