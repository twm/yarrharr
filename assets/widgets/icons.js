import React from 'react';
// TODO: Use minified SVG

export function ArrowLeft(props) {
    return <img src={window.__webpack_public_path__ + require('../arrow.inkscape.svg')} width="16" height="32" {...props} />;
}

export function ArrowRight(props) {
    return <img src={window.__webpack_public_path__ + require('../arrow.inkscape.svg')} width="16" height="32" style={{transform: 'rotate(180deg)'}} {...props} />;
}

export function Eye(props) {
    return <img src={window.__webpack_public_path__ + require('../eye.inkscape.svg')} width="32" height="32" {...props} />;
}

export function Logo(props) {
    return <img src={window.__webpack_public_path__ + require('../icon.inkscape.svg')} width="32" height="32" {...props} />;
}

export function Star(props) {
    return <img src={window.__webpack_public_path__ + require('../star.inkscape.svg')} width="32" height="32" {...props} />;
}

export function Check(props) {
    return <img src={window.__webpack_public_path__ + require('../check.inkscape.svg')} width="32" height="32" {...props} />;
}

export function Heart(props) {
    return <img src={window.__webpack_public_path__ + require('../heart.inkscape.svg')} width="32" height="32" {...props} />;
}

export function Outbound(props) {
    return <img src={window.__webpack_public_path__ + require('../outbound.inkscape.svg')} {...props} />;
}

export function List(props) {
    return <img src={window.__webpack_public_path__ + require('../list.inkscape.svg')} {...props} />;
}
export function Narrow(props) {
    return <img src={window.__webpack_public_path__ + require('../narrow.inkscape.svg')} {...props} />;
}
export function Wide(props) {
    return <img src={window.__webpack_public_path__ + require('../wide.inkscape.svg')} {...props} />;
}
