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
    uploadsFilePathMap = {},
    g_dataConfig = null;

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
    function isDataFile (file) {
        return (file.indexOf('.js') !== -1);
    }

    function parseDataFile (file) {
        // parse json
        fs.readFile(file, function (err, data) {
            if (!err) {
                try {
                    g_dataConfig = {}; // [re]initialize

                    // create filename->data map
                    var json = JSON.parse(data);

                    for (var i = 0, len = json.length; i < len; i++) {
                        g_dataConfig[json[i].url] = json[i];
                    }
                    console.log('read json', g_dataConfig);
                } catch (e) {
                    console.error('Invalid json format', e);
                }
            }
        });
    }
    // parse a file upload
    var form = new formidable.IncomingForm(),
        files = [];

    form.uploadDir = path.join(process.cwd(), 'public', app.get('uploadsDir'));
    form.keepExtensions = true;

    form.on('file', function(name, file) {

        if (isDataFile(file.name)) {
            parseDataFile(file.path);
        } else {
            // otherwise its a sound file  
            // Keep original name on disk
            var newPath = path.join(form.uploadDir, file.name);

            fs.renameSync(file.path, newPath);
            file.path = newPath;
            files.push(file);
        }
    })
    .on('end', function() {
        res.writeHead(200, {'content-type': 'application/json'});

        // Save name->path for analyzing by name
        if (files.length > 0) {
            uploadsFilePathMap[files[0].name] = files[0].path;

            res.end(JSON.stringify({result: true, 
                filename: files[0].name,
                url: path.join(app.get('uploadsDir'), path.basename(files[0].path)),
                size: files[0].size
            }));
        } else {
            res.end(JSON.stringify({result: false}));
        }
    });
    form.parse(req);
});

app.get('/analyze/:filename', function (req, res) {

    function lookupDataConfigEntryByFilename(filename) {
        if (!g_dataConfig) {
            return null;
        }
        var val = g_dataConfig[filename],
            ext = path.extname(filename);

        if (!val) { // try it without the extension
            val = g_dataConfig[path.basename(filename, ext)];
        }
        return val ? val : null;
    }
    var fpath = uploadsFilePathMap[req.params.filename];
    if (!fpath) {
        res.writeHead(404, {'content-type': 'text/html'});
        res.end('file not found');
        return;
    }
    // If we have a data configuration, check it for a matching entry
    var match = lookupDataConfigEntryByFilename(req.params.filename);
    console.log('match for ' + req.params.filename, match);
    if (match !== null) {
        res.writeHead(200, {'content-type': 'application/json'});
        res.end(JSON.stringify({result: true, rms: match.volume}));
        return;
    }
    var cmd = 'python ' + app.get('toolsDir') + '/audiovolume.py ' + fpath;
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
        volumes = req.query.volumes,
        addSourceFiles = req.query.genSource === 'true';

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
        
        if (addSourceFiles) {
            cmd = cmd + ' -s';
        }
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
