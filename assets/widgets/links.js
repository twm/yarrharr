'use strict';
import React from 'react';
import { Link, IndexLink } from 'react-router';
import { FILTER_NEW, FILTER_SAVED, FILTER_ARCHIVED, FILTER_ALL } from '../actions.js';

/**
 * This module contains wrappers around react-router's <Link> component that
 * know about URL layout.  Using them decouples a component from knowledge of
 * the route configuration and validates the given props.
 */

export function AllLink(props) {
    const { filter } = props;
    return <Link to={`/all/${filter}/`} {...props} />;
}

export function ArticleLink(props) {
    const { articleId } = props;
    return <Link to={`/article/${articleId}/`} {...props} />;
}

export function FeedLink(props) {
    const { feedId, filter } = props;
    var path = `/feed/${feedId}/${filter}/`;
    return <Link to={path} {...props} />;
}

export function LabelLink(props) {
    const { labelId, filter } = props;
    return <Link to={`/label/${labelId}/${filter}/`} {...props} />;
}

export function RootLink(props) {
    return <IndexLink to="/" {...props} />;
}

export function InventoryLink(props) {
    return <Link to="/inventory/" {...props} />;
}

export function AddFeedLink(props) {
    return <Link to="/inventory/add/" {...props} />;
}

if (process.env.NODE_ENV !== 'production') {
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
