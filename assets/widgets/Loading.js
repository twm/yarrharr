import React from 'react';
import './Loading.less';

export default function Loading() {
    return <div className="spinner">
        <div className="arc1"><div className="big" /><div className="little" /></div>
        <div className="arc2"><div className="big" /><div className="little" /></div>
        <div className="arc3"><div className="big" /><div className="little" /></div>
        <div className="arc4"><div className="big" /><div className="little" /></div>
        <div className="dot" />
    </div>;
}
