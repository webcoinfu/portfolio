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
            'node_modules/lazysizes/lazysizes.js',
            'node_modules/stream/assets/vendors/jquery.parallax.js',
            'node_modules/stream/assets/js/vendors/parallax.js',
            'node_modules/mixitup/dist/mixitup.js',
            'node_modules/magnific-popup/dist/jquery.magnific-popup.js'
        ],
        minified: [
            'node_modules/stream/assets/vendors/popper.min.js',
            'node_modules/stream/assets/vendors/jquery.min.js',
            'node_modules/stream/assets/vendors/jquery.migrate.min.js',
            'node_modules/stream/assets/vendors/jquery.back-to-top.min.js',
            'node_modules/stream/assets/vendors/jquery.smooth-scroll.min.js',
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
    return cp.spawn( jekyll, ['build'], { stdio: 'inherit' });
}

function style() {
    return gulp.src(paths.styles.src)
        .pipe(changed(paths.styles.dest))
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(concat('app.scss'))
        .pipe(postcss(plugins))
        .pipe(rename('app.css'))
        .pipe(gulp.dest(paths.styles.dest))
        .pipe(browserSync.reload({ stream: true }))
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
        .pipe(changed('./assets/images'))
        .pipe(webp())
        .pipe(gulp.dest('./assets/images/'));
    var thumbnail = gulp.src(paths.images.thumbnail)
        .pipe(changed('./assets/images/thumbs'))
        .pipe(webp())
        .pipe(gulp.dest('./assets/images/thumbs'));
    var svg = gulp.src([
        './develop/images/*.{svg}',
        './develop/images/school-for-selling.jpg',
        './develop/images/carlos-muza-84523-unsplash.jpg'
    ])
        .pipe(changed('./assets/images'))
        .pipe(gulp.dest('./assets/images'));

    return merge(featured, thumbnail, svg);
}

function fonts() {
    var fontAwesome = gulp.src('./node_modules/@fortawesome/fontawesome-free/webfonts/*')
        .pipe(changed('assets/fonts/font-awesome'))
        .pipe(gulp.dest('assets/fonts/font-awesome'));
    
    return merge(fontAwesome);

}

function js() {
    return gulp.src(paths.scripts.src)
    .pipe(foreach(function(stream, file){
        return stream
            .pipe(uglify())
            .pipe(rename({suffix: '.min'}))
    }))
    .pipe(gulp.dest(paths.scripts.dest))
    .pipe(browserSync.reload({ stream: true }))
    .pipe(notify({ 
        'message': 'Scripts task complete' 
    }));
}

function jsMinified() {
    return gulp.src(paths.scripts.minified)
        .pipe(changed(paths.scripts.dest))
        .pipe(gulp.dest(paths.scripts.dest))
        .pipe(browserSync.reload({ stream: true }))
        .pipe(notify({
            'message': 'Minified scripts task complete' 
        }));
}

function browserSyncServe() {
    browserSync.init({
        server: {
            baseDir: './_site/'
        },
        port: 3000
    });
}

function browserSyncReload(done) {
    browserSync.reload();
    done();
}

function watch() {
    gulp.watch(['assets/scss/style.scss', 'assets/scss/**/**/*.scss'], style);
    gulp.watch(
    [
        '*.html', 
        '_layouts/*.html', 
        '_posts/*', 
        '_portfolio/*', 
        '_includes/*',
        '_data/*',
        'assets/css/*.css',
        'assets/js/*.js',
        'assets/images/*.*'
    ],
    gulp.series(jekyllBuild, browserSyncReload));
}

gulp.task('images', images);

gulp.task('default', gulp.parallel(jekyllBuild, fonts, style, criticalCss, gulp.series(js, jsMinified), browserSyncServe, watch));