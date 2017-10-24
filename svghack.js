// Workaround for https://github.com/smooth-code/svgr/issues/7
// Obviously this is a disgusting hack.
module.exports = function(source) {
    return source.replace(/style="[^"]+"/g, '');
};
