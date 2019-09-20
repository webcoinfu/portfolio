var gulp = require('gulp'),
    sass = require('gulp-sass'),
    postcss = require('gulp-postcss'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    notify = require('gulp-notify'),
    foreach = require('gulp-flatmap'),
    browserSync = require('browser-sync').create(),
    cp = require('child_process'),
    autoprefixer = require('autoprefixer'),
    cssnano = require('cssnano'),
    changed = require('gulp-changed'),
    critical = require('critical'),
    merge = require('merge-stream'),
    webp = require('gulp-webp'),
    jekyll = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';

var plugins = [
    autoprefixer,
    cssnano({
        preset: ['default', {
            discardComments: {
                removeAll: true,
            },
        }]
    })
]

var paths = {
    styles: {
        src: 'assets/scss/style.scss',
        dest: 'assets/css'
    },
    scripts: {
        src: [
            'node_modules/stream/assets/vendors/bootstrap/js/bootstrap.js',
            'node_modules/stream/assets/js/global.js',
            'node_modules/stream/assets/vendors/magnific-popup/jquery.magnific-popup.js',
            'node_modules/lazysizes/lazysizes.js',
            'node_modules/stream/assets/vendors/jquery.parallax.js',
            'node_modules/stream/assets/js/vendors/parallax.js',
            'node_modules/stream/assets/js/vendors/shuffle.js',
            'node_modules/stream/assets/js/vendors/magnific-popup.js',
            'node_modules/webp-hero/dist-cjs/polyfills.js',
            'node_modules/webp-hero/dist-cjs/webp-hero.bundle.js'
        ],
        minified: [
            'node_modules/stream/assets/vendors/popper.min.js',
            'node_modules/stream/assets/vendors/jquery.min.js',
            'node_modules/stream/assets/vendors/jquery.migrate.min.js',
            'node_modules/stream/assets/vendors/jquery.back-to-top.min.js',
            'node_modules/stream/assets/vendors/jquery.smooth-scroll.min.js',
            'node_modules/stream/assets/vendors/shuffle/jquery.shuffle.min.js'
        ],
        dest: 'assets/js'
    },
    images: {
        feature: [
            './develop/images/*.{jpg,png}',
            '!./develop/images/school-for-selling.jpg',
            '!./develop/images/*.svg',
            '!./develop/images/thumbs/*.{jpg,png}'
        ],
        thumbnail: [
            './develop/images/thumbs/*'
        ]
    },
    sources: {
        src: [
            'node_modules/stream/assets/include/scss/**/**'
        ],
        dest: 'assets/scss/sources/' 
    }
};

function jekyllBuild() {
    return cp.spawn( jekyll, ['build'], {stdio: 'inherit'})
    // return cp.spawn("bundle", ["exec", "jekyll", "build"], { stdio: "inherit" });
}

function style() {
    return gulp.src(paths.styles.src)
        .pipe(changed(paths.styles.dest))
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(concat('app.scss'))
        .pipe(postcss(plugins))
        .pipe(rename('app.css'))
        .pipe(gulp.dest(paths.styles.dest))
        .pipe(browserSync.stream())
        .pipe(notify({ 
            'message': 'Styles task complete' 
        }));
}

function criticalCss() {
    critical.generate({
        base: './',
        src: '_site/index.html',
        css: 'assets/css/app.css',
        dest: '_includes/critical.css',
        width: 320,
        height: 480,
        minify: true
    });
}

function images() {
    var featured = gulp.src(paths.images.feature)
        .pipe(webp())
        .pipe(gulp.dest('./assets/images/'));
    var thumbnail = gulp.src(paths.images.thumbnail)
        .pipe(webp())
        .pipe(gulp.dest('./assets/images/thumbs'));
    var svg = gulp.src([
        './develop/images/*.{svg}',
        './develop/images/school-for-selling.jpg'
    ])
        .pipe(gulp.dest('./assets/images'));

    return merge(featured, thumbnail, svg);
}

function js() {
    return gulp.src(paths.scripts.src)
    .pipe(foreach(function(stream, file){
        return stream
            .pipe(uglify())
            .pipe(rename({suffix: '.min'}))
    }))
    .pipe(gulp.dest(paths.scripts.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ 
        'message': 'Scripts task complete' 
    }));
}

function jsMinified() {
    return gulp.src(paths.scripts.minified)
        .pipe(changed(paths.scripts.dest))
        .pipe(gulp.dest(paths.scripts.dest))
        .pipe(browserSync.stream())
        .pipe(notify({
            'message': 'Minified scripts task complete' 
        }));
}

function browserSyncServe(done) {
    browserSync.init({
        injectChanges: true,
        server: {
            baseDir: './_site/'
        },
        port: 3000
    });
    gulp.watch('_site/**/*.*').on('change', browserSync.reload);
    done();
}

function browserSyncReload(done) {
    browserSync.reload();
    done();
}

function watch() {
    gulp.watch(['assets/scss/style.scss', 'assets/scss/**/**/*.scss'], style).on('change', browserSync.reload)
    gulp.watch(paths.scripts.src, gulp.series(js, jsMinified))
    gulp.watch(
    [
        '*.html', 
        '_layouts/*.html', 
        '_posts/*', 
        '_portfolio/*', 
        '_includes/*',
        '_data/*'
    ],
    gulp.series(jekyllBuild, browserSyncReload));
}

gulp.task('images', images);

gulp.task('default', gulp.parallel(jekyllBuild, style, criticalCss, gulp.series(js, jsMinified), browserSyncServe, watch));