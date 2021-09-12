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

export const AllLink = ({filter, ...props}) => <a {...props} href={`/all/${filter}/`} />;
export const AllArticleLink = ({filter, articleId, ...props}) => <a {...props} href={`/article/${articleId}/`} />;
export const FeedLink = ({feedId, filter, ...props}) => <a {...props} href={`/feed/${feedId}/${filter}/`} />;
export const FeedArticleLink = ({feedId, filter, articleId, ...props}) => <a {...props} href={`/feed/${feedId}/${filter}/${articleId}/`} />;
export const LabelLink = ({labelId, filter, ...props}) => <a {...props} href={`/label/${labelId}/${filter}/`} />;
export const LabelArticleLink = ({articleId, ...props}) => <a {...props} href={`/article/${articleId}/`} />;
export const HomeLink = (props) => <a {...props} href="/" />;
export const FeedListLink = (props) => <a { ...props} href="/inventory/" />;
export const FeedDetailLink = ({feedId, ...props}) => <a {...props} href={`/inventory/feed/${feedId}/`} />;
export const LabelListLink = (props) => <a {...props} href="/inventory/labels/" />;
export const LabelDetailLink = ({labelId, ...props}) => <a {...props} href={`/inventory/label/${labelId}/`} />;
export const AddFeedLink = makeLink((props) => { return { ...props, href: "/inventory/add/" }; });

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
    FeedDetailLink.propTypes = {
        feedId: PropTypes.number.isRequired,
    };
    LabelDetailLink.propTypes = {
        labelId: PropTypes.number.isRequired,
    };
}
