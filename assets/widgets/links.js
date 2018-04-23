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
        this.handleClick = event => {
            if (event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
                return;
            }
            if (event.button !== 0) { // left button
                return;
            }
            event.preventDefault();
            this.props.dispatch(setPath(this.props.href));
        }
    }
    render() {
        const {dispatch, ...props} = this.props;
        return <a {...props} onClick={this.handleClick} />;
    }
}

const ConnectedA = connect(null, null)(A);

const makeLink = transformProps => props => <ConnectedA {...transformProps(props)} />;

export const AllLink = makeLink(({filter, ...props}) => { return { ...props, href: `/all/${filter}/`}; });
export const AllArticleLink = makeLink(({filter, articleId, ...props}) => { return { ...props, href: `/all/${filter}/${articleId}/`}; });
export const FeedLink = makeLink(({feedId, filter, ...props}) => { return { ...props, href: `/feed/${feedId}/${filter}/`}; });

export function FeedArticleLink(props) {
    return <ConnectedA href={`/feed/${props.feedId}/${props.filter}/${props.articleId}/`} disabled={props.disabled} className={props.className} title={props.title} children={props.children} />;
}

export function LabelLink(props) {
    return <ConnectedA href={`/label/${props.labelId}/${props.filter}/`} disabled={props.disabled} className={props.className} title={props.title} children={props.children} />;
}

export function LabelArticleLink(props) {
    return <ConnectedA href={`/label/${props.labelId}/${props.filter}/${props.articleId}/`} disabled={props.disabled} className={props.className} title={props.title} children={props.children} />;
}


export function RootLink(props) {
    return <ConnectedA href="/" disabled={props.disabled} className={props.className} title={props.title} children={props.children} />;
}

export function InventoryLink(props) {
    return <ConnectedA href="/inventory/" disabled={props.disabled} className={props.className} title={props.title} children={props.children} />;
}

export function InventoryFeedLink(props) {
    return <ConnectedA href={`/inventory/feed/${props.feedId}/`} disabled={props.disabled} className={props.className} title={props.title} children={props.children} />;
}

export function LabelListLink(props) {
    return <ConnectedA href="/inventory/labels/" disabled={props.disabled} className={props.className} title={props.title} children={props.children} />;
}

export function InventoryLabelLink(props) {
    return <ConnectedA href={`/inventory/label/${props.labelId}/`} disabled={props.disabled} className={props.className} title={props.title} children={props.children} />;
}

export function AddFeedLink(props) {
    return <ConnectedA href="/inventory/add/" disabled={props.disabled} className={props.className} title={props.title} children={props.children} />;
}

if (process.env.NODE_ENV !== 'production') {
    A.propTypes = {
        href: PropTypes.string.isRequired,
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
    InventoryLabelLink.propTypes = {
        labelId: PropTypes.number.isRequired,
    };
}
