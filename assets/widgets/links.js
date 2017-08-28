'use strict';
import React from 'react';
import { connect } from 'react-redux';

import { setPath } from '../actions.js';
import { FILTER_NEW, FILTER_SAVED, FILTER_ARCHIVED, FILTER_ALL } from '../actions.js';

/**
 * This module contains wrappers around the <a> element that know about URL
 * layout. Using them decouples a component from knowledge of the route
 * configuration and validates the given props.
 */

/**
 * Private helper which dispatches an action instead of allowing the browser to
 * navigate. This is kind of a hack, since it has to be connected in order to
 * actually dispatch the action. It really replicates some of the
 * action-at-a-distance that made React Router so confusing in combination with
 * Redux.
 */
const A = React.createClass({
    handleClick(event) {
        console.log('Got click on', this.props.path);
        event.preventDefault();
        this.props.dispatch(setPath(this.props.path));
    },
    render() {
        const href = this.props.path;
        return <a href={href} {...this.props} onClick={this.handleClick} />;
    }
});

const ConnectedA = connect(null, null)(A);

export function AllLink(props) {
    const { filter } = props;
    return <ConnectedA path={`/all/${filter}/`} {...props} />;
}

export function ArticleLink(props) {
    const { articleId } = props;
    return <ConnectedA path={`/article/${articleId}/`} {...props} />;
}

export function FeedLink(props) {
    const { feedId, filter } = props;
    var path = `/feed/${feedId}/${filter}/`;
    return <ConnectedA path={path} {...props} />;
}

export function LabelLink(props) {
    const { labelId, filter } = props;
    return <ConnectedA path={`/label/${labelId}/${filter}/`} {...props} />;
}

export function RootLink(props) {
    return <ConnectedA path="/" {...props} />;
}

export function InventoryLink(props) {
    return <ConnectedA path="/inventory/" {...props} />;
}

export function AddFeedLink(props) {
    return <ConnectedA path="/inventory/add/" {...props} />;
}

if (process.env.NODE_ENV !== 'production') {
    A.propTypes = {
        path: React.PropTypes.string,
    };
    const filter = React.PropTypes.oneOf([FILTER_NEW, FILTER_SAVED, FILTER_ARCHIVED, FILTER_ALL]).isRequired;
    AllLink.propTypes = {
        filter,
    };
    ArticleLink.propTypes = {
        articleId: React.PropTypes.number.isRequired,
    };
    FeedLink.propTypes = {
        feedId: React.PropTypes.number.isRequired,
        filter,
    };
    LabelLink.propTypes = {
        labelId: React.PropTypes.number.isRequired,
        filter,
    };
}
