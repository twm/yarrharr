import React from 'react';
// TODO: Use minified SVG

function ArrowLeft(props) {
    return <img src={window.__webpack_public_path__ + require('../arrow.inkscape.svg')} width="16" height="32" {...props} />;
}

function ArrowRight(props) {
    return <img src={window.__webpack_public_path__ + require('../arrow.inkscape.svg')} width="16" height="32" style={{transform: 'rotate(180deg)'}} {...props} />;
}

function Eye(props) {
    return <img src={window.__webpack_public_path__ + require('../eye.inkscape.svg')} width="32" height="32" {...props} />;
}

function Logo(props) {
    return <img src={window.__webpack_public_path__ + require('../icon.inkscape.svg')} width="32" height="32" {...props} />;
}

function Star(props) {
    return <img src={window.__webpack_public_path__ + require('../star.inkscape.svg')} width="32" height="32" {...props} />;
}

function Check(props) {
    return <img src={window.__webpack_public_path__ + require('../check.inkscape.svg')} width="32" height="32" {...props} />;
}

function Heart(props) {
    return <img src={window.__webpack_public_path__ + require('../heart.inkscape.svg')} width="32" height="32" {...props} />;
}

module.exports = {
    ArrowLeft,
    ArrowRight,
    Eye,
    Logo,
    Star,
    Check,
    Heart,
};
