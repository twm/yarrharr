'use strict';
import React from 'react';
import PropTypes from 'prop-types';
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
 * navigate.
 */
const A = React.createClass({
    handleClick(event) {
        event.preventDefault();
        this.props.dispatch(setPath(this.props.path));
    },
    render() {
        return <a href={this.props.path} onClick={this.handleClick} className={this.props.className} children={this.props.children} />;
    }
});

const ConnectedA = connect(null, null)(A);

export function AllLink(props) {
    return <ConnectedA path={`/all/${props.filter}/`} className={props.className} children={props.children} />;
}

export function ArticleLink(props) {
    return <ConnectedA path={`/article/${props.articleId}/`} className={props.className} children={props.children} />;
}

export function FeedLink(props) {
    return <ConnectedA path={`/feed/${props.feedId}/${props.filter}/`} className={props.className} children={props.children} />;
}

export function LabelLink(props) {
    return <ConnectedA path={`/label/${props.labelId}/${props.filter}/`} className={props.className} children={props.children} />;
}

export function RootLink(props) {
    return <ConnectedA path="/" className={props.className} children={props.children} />;
}

export function InventoryLink(props) {
    return <ConnectedA path="/inventory/" className={props.className} children={props.children} />;
}

export function AddFeedLink(props) {
    return <ConnectedA path="/inventory/add/" className={props.className} children={props.children} />;
}

if (process.env.NODE_ENV !== 'production') {
    A.propTypes = {
        path: PropTypes.string,
    };
    const filter = PropTypes.oneOf([FILTER_NEW, FILTER_SAVED, FILTER_ARCHIVED, FILTER_ALL]).isRequired;
    AllLink.propTypes = {
        filter,
    };
    ArticleLink.propTypes = {
        articleId: PropTypes.number.isRequired,
    };
    FeedLink.propTypes = {
        feedId: PropTypes.number.isRequired,
        filter,
    };
    LabelLink.propTypes = {
        labelId: PropTypes.number.isRequired,
        filter,
    };
}
