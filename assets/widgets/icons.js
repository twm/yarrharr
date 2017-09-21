import React from 'react';
// TODO: #79 Use minified SVG

export function Add(props) {
    return <img src={window.__webpack_public_path__ + require('../art/add.inkscape.svg')} {...props} />;
}

export function Remove(props) {
return <img src={window.__webpack_public_path__ + require('../art/add.inkscape.svg')} {...props} style={{transform: 'rotate(45deg)'}} />;
}

export function ArrowLeft(props) {
    return <img src={window.__webpack_public_path__ + require('../art/arrow.inkscape.svg')} width="32" height="32" {...props} />;
}

export function ArrowRight(props) {
    return <img src={window.__webpack_public_path__ + require('../art/arrow.inkscape.svg')} width="32" height="32" style={{transform: 'rotate(180deg)'}} {...props} />;
}

export function Home(props) {
    return <img src={window.__webpack_public_path__ + require('../art/home.inkscape.svg')} width="40" height="40" {...props} />;
}

export function Logo(props) {
    return <img src={window.__webpack_public_path__ + require('../art/icon.inkscape.svg')} width="32" height="32" {...props} />;
}

export function Star(props) {
    return <img src={window.__webpack_public_path__ + require('../art/star.inkscape.svg')} width="32" height="32" {...props} />;
}

export function Check(props) {
    return <img src={window.__webpack_public_path__ + require('../art/check.inkscape.svg')} width="32" height="32" {...props} />;
}

export function CheckEmpty(props) {
    return <img src={window.__webpack_public_path__ + require('../art/check-empty.inkscape.svg')} width="32" height="32" {...props} />;
}

export function Heart(props) {
    return <img src={window.__webpack_public_path__ + require('../art/heart.inkscape.svg')} width="32" height="32" {...props} />;
}

export function HeartEmpty(props) {
    return <img src={window.__webpack_public_path__ + require('../art/heart-empty.inkscape.svg')} width="32" height="32" {...props} />;
}

export function Outbound(props) {
    return <img src={window.__webpack_public_path__ + require('../art/outbound.inkscape.svg')} {...props} />;
}

export function List(props) {
    return <img src={window.__webpack_public_path__ + require('../art/list.inkscape.svg')} {...props} />;
}

export function Narrow(props) {
    return <img src={window.__webpack_public_path__ + require('../art/narrow.inkscape.svg')} {...props} />;
}

export function Wide(props) {
    return <img src={window.__webpack_public_path__ + require('../art/wide.inkscape.svg')} {...props} />;
}

export function Ascending(props) {
    return <img src={window.__webpack_public_path__ + require('../art/ascending.inkscape.svg')} {...props} />;
}

export function Descending(props) {
    return <img src={window.__webpack_public_path__ + require('../art/ascending.inkscape.svg')} style={{transform: 'rotate(180deg)'}} {...props} />;
}
