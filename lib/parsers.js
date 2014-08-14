var fs = require('fs');
var protobuf = require('protocol-buffers');

function rmComments(s) {
    s = s.replace(/\/\/.*/g, "").replace(/\n/g, "").replace(/\/\*.+?\*\//g, "");
    return s;
}

module.exports = {
    file: protobuf(rmComments(fs.readFileSync(__dirname + '/fileformat.proto', 'utf8'))),
    osm: protobuf(rmComments(fs.readFileSync(__dirname + '/osmformat.proto', 'utf8')))
};
