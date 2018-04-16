import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { Clock } from 'widgets/time.jsm';

/**
 * <Yarrharr/> is the top-level container of the app. It assigns a class
 * according to the current layout:
 *
 * * layout-narrow
 * * layout-wide
 */
export class Yarrharr extends React.PureComponent {
    render() {
        return <div id="yarrharr" className={"layout-" + this.props.layout}>
            <Clock>
                {this.props.children}
            </Clock>
        </div>
    }
}

export const ConnectedYarrharr = connect(state => {
    return {layout: state.layout};
})(Yarrharr);
