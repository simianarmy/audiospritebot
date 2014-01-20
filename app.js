/**
 * node express app
 */
var express = require('express'),
    partials = require('express-partials'),
    http = require('http'),
    path = require('path'),
    url = require('url'),
    util = require('util'),
    fs = require('fs'),
    temp = require('temp'),
    formidable = require('formidable'),
    exec = require('child_process').exec;

var app = express(),
    uploadsFilePathMap = {};

temp.track(); // for temp cleanup

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    //app.set('views', __dirname + '/views');
    //app.set('view engine', 'ejs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(app.router);
    // app.router MUST come before express.bodyParser for file uploads to work!
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('secretsession'));
    app.use(express.session());
    app.use(express.static(path.join(__dirname, 'public')));
    app.set('toolsDir', path.join(__dirname, 'tools'));
    app.set('uploadsDir', 'uploads');
    //app.use(partials());
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

/**
 * Above this line are Express Defaults.
 */

/**
 * File upload handler
 */
app.post('/upload', function(req, res) {
    // parse a file upload
    var form = new formidable.IncomingForm(),
        files = [];
    form.uploadDir = path.join(process.cwd(), 'public', app.get('uploadsDir'));
    form.keepExtensions = true;

    form.on('file', function(name, file) {
        // Keep original name on disk
        var newPath = path.join(form.uploadDir, file.name);

        fs.renameSync(file.path, newPath);
        file.path = newPath;
        files.push(file);
    })
    .on('end', function() {
        // Save name->path for analyzing by name
        uploadsFilePathMap[files[0].name] = files[0].path;

        res.writeHead(200, {'content-type': 'application/json'});
        res.end(JSON.stringify({result: true, 
            filename: files[0].name,
            url: path.join(app.get('uploadsDir'), path.basename(files[0].path)),
            size: files[0].size
        }));
    });
    form.parse(req);
});

app.get('/analyze/:filename', function (req, res) {
    var path = uploadsFilePathMap[req.params.filename];
    if (!path) {
        res.writeHead(404, {'content-type': 'text/html'});
        res.end('file not found');
        return;
    }
    var cmd = 'python ' + app.get('toolsDir') + '/audiovolume.py ' + path;
    console.log(cmd);
    exec(cmd, function (error, stdout, stderr) {
        var info = error ? -1 : stdout.split(','),
            data = {};

        data.result = error !== undefined;

        if (info !== -1) {
            data.rms = info[0];
            data.max = info[1];
            data.max_amp = info[2];
        }
        res.writeHead(200, {'content-type': 'application/json'});
        res.end(JSON.stringify(data));
    });
});

/**
 * Sprite creator
 */
app.get('/generate', function (req, res) {
    // Get list of audio files with volumes from request
    var filenames = req.query.files,
        volumes = req.query.volumes;

    temp.open({suffix: '.zip'}, function (err, info) {
        // Generate arguments to python script and execute
        var cmd = util.format('python %s %s -o %s -f %s -v %s', 
            app.get('toolsDir') + '/gensprites.py',
            'sprite',
            info.path,
            // unsafe input won't match our map so that's a free safety check
            filenames.map(function (f) {
                return uploadsFilePathMap[f];
            }).join(' '),
            // force form input to integers for safety
            volumes.map(function (v) {
                return parseInt(v, 10);
            }).join(' '));
        console.log(cmd);

        exec(cmd, function (error, stdout, stderr) {
            if (!error) {
                console.log('sending for zip download...', info.path);
                res.download(info.path, 'audiosprite.zip', function (err) {
                    if (err) {
                        console.log('error sending ' + info.path, err);
                    }
                });
            } else {
                temp.cleanup();
            }
        });
    });
});

http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
