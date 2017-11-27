'use strict';
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { setPath } from '../actions.js';
import { FILTER_UNREAD, FILTER_FAVE, FILTER_ALL } from '../actions.js';

/**
 * This module contains wrappers around the <a> element that know about URL
 * layout. Using them decouples a component from knowledge of the route
 * configuration and validates the given props.
 */

/**
 * Private helper which dispatches an action instead of allowing the browser to
 * navigate.
 */
class A extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleClick = (event) => {
            event.preventDefault();
            if (!this.props.disabled) {
                this.props.dispatch(setPath(this.props.path));
            }
        }
    }
    render() {
        return <a
            aria-disabled={!!this.props.disabled}
            tabIndex={this.props.disabled ? -1 : 0}
            href={this.props.path}
            onClick={this.handleClick}
            className={this.props.className}
            children={this.props.children}
        />;
    }
}

const ConnectedA = connect(null, null)(A);

export function AllLink(props) {
    return <ConnectedA path={`/all/${props.filter}/`} disabled={props.disabled} className={props.className} children={props.children} />;
}

export function AllArticleLink(props) {
    return <ConnectedA path={`/all/${props.filter}/${props.articleId}/`} disabled={props.disabled} className={props.className} children={props.children} />;
}

export function FeedLink(props) {
    return <ConnectedA path={`/feed/${props.feedId}/${props.filter}/`} disabled={props.disabled} className={props.className} children={props.children} />;
}

export function FeedArticleLink(props) {
    return <ConnectedA path={`/feed/${props.feedId}/${props.filter}/${props.articleId}/`} disabled={props.disabled} className={props.className} children={props.children} />;
}

export function LabelLink(props) {
    return <ConnectedA path={`/label/${props.labelId}/${props.filter}/`} disabled={props.disabled} className={props.className} children={props.children} />;
}

export function LabelArticleLink(props) {
    return <ConnectedA path={`/label/${props.labelId}/${props.filter}/${props.articleId}/`} disabled={props.disabled} className={props.className} children={props.children} />;
}


export function RootLink(props) {
    return <ConnectedA path="/" disabled={props.disabled} className={props.className} children={props.children} />;
}

export function InventoryLink(props) {
    return <ConnectedA path="/inventory/" disabled={props.disabled} className={props.className} children={props.children} />;
}

export function InventoryFeedLink(props) {
    return <ConnectedA path={`/inventory/feed/${props.feedId}/`} disabled={props.disabled} className={props.className} children={props.children} />;
}

export function AddFeedLink(props) {
    return <ConnectedA path="/inventory/add/" disabled={props.disabled} className={props.className} children={props.children} />;
}

if (process.env.NODE_ENV !== 'production') {
    A.propTypes = {
        path: PropTypes.string.isRequired,
        disabled: PropTypes.bool,
        dispatch: PropTypes.func.isRequired,
    };
    const filter = PropTypes.oneOf([FILTER_UNREAD, FILTER_FAVE, FILTER_ALL]).isRequired;
    AllLink.propTypes = {
        filter,
    };
    AllArticleLink.propTypes = {
        filter,
        articleId: PropTypes.number.isRequired,
    };
    FeedLink.propTypes = {
        feedId: PropTypes.number.isRequired,
        filter,
    };
    FeedArticleLink.propTypes = {
        feedId: PropTypes.number.isRequired,
        filter,
        articleId: PropTypes.number.isRequired,
    };
    LabelLink.propTypes = {
        labelId: PropTypes.number.isRequired,
        filter,
    };
    LabelArticleLink.propTypes = {
        labelId: PropTypes.number.isRequired,
        filter,
        articleId: PropTypes.number.isRequired,
    };
    InventoryFeedLink.propTypes = {
        feedId: PropTypes.number.isRequired,
    };
}
