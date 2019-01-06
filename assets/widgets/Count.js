import React from 'react';
import PropTypes from 'prop-types';

import './Count.less';


export function Count({value}) {
    if (value === 0) {
        return null;
    }
    if (value > 999) {
        value = (value / 1000.0).toFixed(1) + "k";
    }
    return <span className="count">{value}</span>;
}

if (__debug__) {
    Count.propTypes = {
        value: PropTypes.number.isRequired,
    };
}
