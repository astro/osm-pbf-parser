var fs = require('fs');
var protobuf = require('protocol-buffers');

module.exports = {
    file: protobuf(fs.readFileSync(__dirname + '/fileformat.proto', 'utf8')),
    osm: protobuf(fs.readFileSync(__dirname + '/osmformat.proto', 'utf8'))
};
