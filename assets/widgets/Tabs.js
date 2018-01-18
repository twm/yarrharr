import React from 'react';
import './Tabs.less';

export function Tabs(props) {
    return <div className="tabs">
        <div className="tabs-tabs">
            {props.children}
        </div>
    </div>;
}
