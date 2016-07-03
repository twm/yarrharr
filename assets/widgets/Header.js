import React from 'react';
import './Header.less';

export default function Header({children}) {
    return <div className="header floater-wrap">
        <div className="floater">
            <h1>{children}</h1>
        </div>
    </div>;
}
