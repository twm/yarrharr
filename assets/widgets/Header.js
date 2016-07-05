import React from 'react';
import './Header.less';

export default function Header({text, icon=null, children=null}) {
    return <div className="header floater-wrap">
        <div className="floater">
            {icon ? icon : null}
            <h1>{text}</h1>
            {children}
        </div>
    </div>;
}
