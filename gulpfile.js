var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var sourcemaps = require('gulp-sourcemaps');

gulp.task("default", function () {

  var tsResult = gulp.src('src/**/*.ts')
    .pipe(sourcemaps.init())
    .pipe(tsProject());

  return tsResult
    .pipe(sourcemaps.write('.', {
      sourceRoot: function(file) { return file.cwd + '/src'; }
    }))
    .pipe(gulp.dest("dist"));
});
