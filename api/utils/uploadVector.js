var settings = require('./../settings');
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var sendMail = require('./mail.js').sendMail;
var auth = require('./authentication.js');
var spawn = require('child_process').spawn;
var pgWrite = require.main.require('./db').pgWrite;
var emailAdmin = settings.mail.config.emailAdmin;
var utils = require('./utils.js');
var toRes = utils.toRes;
var removeSource = require('./db.js').removeSource;
var isLayerValid = require('./db.js').isLayerValid;
var layerHasValues = require('./db.js').tableHasValues;
var err = require('./errors.js').handleErrorText;
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    var pathTemp = settings.vector.path.temporary;
    cb(null, pathTemp);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});

var uploadHandler = multer({storage: storage}).single('vector');

/**
 * Upload's middleware
 */
module.exports.upload = [
  uploadHandler,
  auth.validateTokenHandler,
  auth.validateRoleHandlerFor('publisher'),
  convertOgrHandler,
  addSourceHandler
];

/*
 * Export other utils
 */

module.exports.convertOgrHandler = convertOgrHandler;
module.exports.fileToPostgres = fileToPostgres;

/**
 * Convert data
 */
function convertOgrHandler(req, res, next) {
  msg = '';
  var sourceSrs, fileName, idUser, userToken, idProject;
  var hasBody = typeof req.body === 'object';

  if (hasBody) {
    idUser = req.body.idUser * 1;
    idProject = req.body.idProject || req.body.project;
    userToken = req.body.token;
    userEmail = req.body.email;
    sourceSrs = req.body.sourceSrs;
    fileName = req.body.fileName || req.file ? req.file.filename : '';
  } else {
    idUser = req.query.idUser;
    idProject = req.query.idProject || req.query.project;
    userToken = req.query.token;
    userEmail = req.query.email;
    sourceSrs = req.query.sourceSrs;
    fileName = req.query.fileName;
  }

  fileToPostgres({
    fileName: fileName,
    sourceSrs: sourceSrs,
    onSuccess: function(idSource) {
      req.body.idSource = idSource;
      next();
    },
    onMessage: function(data) {
      if (data.msg) {
        res.write(
          toRes({
            type: data.type,
            msg: data.msg
          })
        );
      }
    },
    onError: function(data) {
      res.write(
        toRes({
          type: 'error',
          msg: data.msg
        })
      );

      sendMail({
        to: [userEmail, emailAdmin].join(','),
        text: data.msg,
        subject: `MapX import error`
      });

      res.status(500).end();
    }
  });
}

/**
 * Handler for adding reccord in source table
 */
function addSourceHandler(req, res) {
  /**
   * TODO: use dedicated function registerOrRemoveSource in db.js
   */
  var title = req.body.title;
  var email = req.body.email;
  var idProject = req.body.project;
  var idUser = req.body.idUser * 1;
  var idSource = req.body.idSource;
  var fileToRemove = req.file.path;
  var msg = {};

  msg.waitValidation = `Geometry validation – This could take a while, please wait. If an error occurs, a message will be displayed `;
  msg.addedNewEntry = `Added new entry ${title} ( id = ${idSource} ) in project ${idProject}.`;
  msg.invalidGeom = `Some geometries were not valid and some MapX functions will therefore not work properly. Please correct those geometries.`;
  msg.titleMailSuccess = `MapX import success for source ${title}`;
  msg.titleMailError = `MapX import failed for source ${title}`;

  var sqlAddSource = `INSERT INTO mx_sources (
    id, editor, readers, editors, date_modified, type, project, data
  ) VALUES ( 
    $1::text,
    $2::integer,
'["publishers"]',
'["publishers"]',
    now(),
'vector',
    $3::text,
'{"meta":{"text":{"title":{"en":"${title}"}}}}'
  )`;

  pgWrite
    .query(sqlAddSource, [idSource, idUser, idProject])
    .then(function() {
      /**
       * Layer validation
       */
      res.write(
        toRes({
          type: 'message',
          msg: msg.waitValidation
        })
      );
      return isLayerValid(idSource);
    })
    .then((layerTest) => {
      isValid = layerTest.valid;

      /**
       * Final step : send a message
       */
      cleanFile(fileToRemove, res);
      if (!isValid) {
        res.write(
          toRes({
            type: 'warning',
            msg: msg.invalidGeom
          })
        );
      }

      res.write(
        toRes({
          type: 'end',
          msg: msg.addedNewEntry
        })
      );

      if (email) {
        var mailConf = {
          to: [email],
          text: isValid
            ? msg.addedNewEntry
            : msg.addedNewEntry + '\n' + msg.invalidGeom,
          subject: msg.titleMailSuccess
        };

        sendMail(mailConf);
      }

      res.status(200).end();
    })
    .catch(function(err) {
      cleanAll(fileToRemove, idSource, res)
        .then(function() {
          /**
           * In case of error, send maio
           */
          var msgError = msg.titleMailError + ': ' + err;
          res.write(
            toRes({
              type: 'error',
              msg: msgError
            })
          );

          sendMail({
            to: [email, emailAdmin].join(','),
            text: msgError,
            subject: msg.titleMailError
          });

          res.status('403').end();
        })
        .catch(function(err) {
          res.write(
            toRes({
              type: 'error',
              msg: `Unexpected error :  ${err} `
            })
          );
          res.status('403').end();
        });
    });
}

/**
 * If importeed file exists, remove it
 */
function cleanFile(fileToRemove, res) {
  if (fs.exists(fileToRemove)) {
    fs.unlink(fileToRemove);
  }
  res.write(
    toRes({
      type: 'message',
      msg: `Removed temporary files`
    })
  );
}

/**
 * In case of faillure, clean the db : remove added entry and table
 */
function cleanAll(fileToRemove, idSource, res) {
  return removeSource(idSource).then(() => {
    cleanFile(fileToRemove,res);
    res.write(
      toRes({
        type: 'message',
        msg: `New entry and table were removed, if needed.`
      })
    );
  });
}
/**
 * Helper to write file in postgres
 *
 * @param {Object} config Config
 * @param {String} config.fileName Filename
 * @param {String} config.sourceSrs Original SRS
 * @param {Function} config.onError Callback on error
 * @param {Function} config.onMessage Callback on message
 * @param {Function} config.onSuccess Callback on success
 */
function fileToPostgres(config) {
  config = config || {};
  var fileName = config.fileName;
  var sourceSrs = config.sourceSrs;
  var onMessage = config.onMessage || function() {};
  var onError = config.onError || function() {};
  var onSuccess = config.onSuccess || function() {};
  var idSource = utils.randomString('mx_vector', 4, 5).toLowerCase();

  if (!fileName) {
    throw new Error('No filename given');
  }

  var filePath = path.format({
    dir: settings.vector.path.temporary,
    base: fileName
  });

  var isZip = fileName.search(/.zip$|.gz$/) !== -1;

  if (isZip) {
    filePath = '/vsizip/' + filePath;
  }

  onMessage({
    msg: 'Conversion : please wait ...',
    type: 'message'
  });

  /**
  * NOTE: PGDump OGR driver was needed because OGR PG was not compatible with
  * PG_POOL : connection were never closed.
  *
  * pg-copy-stream
  * --------------
  * pg-copy-stream needed a stream from a file containing a simple table. 
  * Streaming from a spawn stdout did not work. OGR make a dump and not 
  * only a table : which means a lot of command to prepare the copy query. 
  * Streaming through node-pg-copy-stream is _maybe_ not even possible 
  * because of this. *Streaming directly to og using node-pg seems to
  * be the cleanest way of doing this*
  *
  * ogr and psql as spawn
  * ---------------------
  * Piping a ogr2ogr spawn to a spawn of psql did not work
  *
  * ogr and psal as script
  * ----------------------
  * Given the limited time to work on this, a warkaround has been found, 
  * using a script. This should be a temporary fix.
  */
  var args = ['./sh/import_vector.sh', filePath, idSource, sourceSrs];

  var ogr = spawn('sh', args);

  ogr.stdout.on('data', function(data) {
    data = data.toString('utf8');
    var progressNums = data.split('.');
    var hasProg = false;
    progressNums.forEach(function(prog) {
      prog = parseFloat(prog);
      if (!isNaN(prog) && isFinite(prog)) {
        hasProg = true;
        onMessage({
          msg: prog,
          type: 'progress'
        });
      }
    });
    if (!hasProg) {
      onMessage({
        msg: data,
        type: 'message'
      });
    }
  });

  ogr.stderr.on('data', function(data) {
    data = data.toString('utf8');
    onMessage({
      msg: err(data),
      type: 'warning'
    });
  });

  ogr.on('exit', function(code, signal) {
    if (code !== 0) {
      onError({
        code: code,
        msg: `The import function exited with code ${code} ( ${signal} )`
      });
      return;
    }

    layerHasValues(idSource)
      .then((has) => {
        if (has) {
          onMessage({
            msg: `The import was successful`,
            type: 'message'
          });

          onSuccess(idSource);
        } else {
          onError({
            code: code,
            msg: `The import function failed No layer has been created. Verify your logs.`
          });
          return;
        }
      })
      .catch((e) => {
        onError({
          code: code,
          msg: `An error occured in import function (${err(e)})`
        });
        return;
      });
  });
}
