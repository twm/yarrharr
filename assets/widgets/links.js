'use strict';
import React from 'react';
import { connect } from 'react-redux';

import { setLocation } from '../actions.js';
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
        console.log('Got click on', this.props.pathname);
        event.preventDefault();
        this.props.dispatch(setLocation({
            pathname: this.props.pathname,
            search: '',
            hash: '',
        }));
    },
    render() {
        // FIXME: To enable non-default root paths, tack on the URL prefix here.
        const href = this.props.pathname;
        return <a href={href} {...this.props} onClick={this.handleClick} />;
    }
});

const ConnectedA = connect(null, null)(A);

export function AllLink(props) {
    const { filter } = props;
    return <ConnectedA pathname={`/all/${filter}/`} {...props} />;
}

export function ArticleLink(props) {
    const { articleId } = props;
    return <ConnectedA pathname={`/article/${articleId}/`} {...props} />;
}

export function FeedLink(props) {
    const { feedId, filter } = props;
    var path = `/feed/${feedId}/${filter}/`;
    return <ConnectedA pathname={path} {...props} />;
}

export function LabelLink(props) {
    const { labelId, filter } = props;
    return <ConnectedA pathname={`/label/${labelId}/${filter}/`} {...props} />;
}

export function RootLink(props) {
    return <ConnectedA pathname="/" {...props} />;
}

export function InventoryLink(props) {
    return <ConnectedA pathname="/inventory/" {...props} />;
}

export function AddFeedLink(props) {
    return <ConnectedA pathname="/inventory/add/" {...props} />;
}

if (process.env.NODE_ENV !== 'production') {
    A.propTypes = {
        pathname: React.PropTypes.string,
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
