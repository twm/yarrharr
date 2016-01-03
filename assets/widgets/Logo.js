import React from 'react';


function Logo() {
    // TODO: Use minified SVG
    return <img src={window.__webpack_public_path__ + require('../icon.inkscape.svg')} width="32" height="32" />;
}


module.exports = Logo;
