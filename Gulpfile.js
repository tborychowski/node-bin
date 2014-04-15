var gulp = require('gulp'),
	gutil = require('gulp-util'),
	insert = require('gulp-insert');


gulp.task('build', function () {
	gulp.src('./src/*.js')
		.pipe(insert.prepend('#!/usr/bin/node\n'))
		.pipe(gulp.dest('./dist'));
});

gulp.task('default', [ 'build' ]);
