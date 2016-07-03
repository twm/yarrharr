'use strict';
import React from 'react';
import { Link, IndexLink } from 'react-router';

/**
 * This module contains wrappers around react-router's <Link> component that
 * know about URL layout.  Using them decouples a component from knowledge of
 * the route configuration.
 */

export function AllLink(props) {
    const { feedId, filter=null } = props;
    var path = "/all/";
    if (filter) {
        path += `?filter=${filter}`;
    }
    return <Link to={path} {...props} />;
}

export function ArticleLink(props) {
    const { articleId } = props;
    return <Link to={`/article/${articleId}/`} {...props} />;
}

export function FeedLink(props) {
    const { feedId, filter=null } = props;
    var path = `/feed/${feedId}/`;
    if (filter) {
        path += `?filter=${filter}`;
    }
    return <Link to={path} {...props} />;
}

export function LabelLink(props) {
    const { labelId } = props;
    return <Link to={`/label/${labelId}/`} {...props} />;
}

export function RootLink(props) {
    return <IndexLink to="/" {...props} />;
}

export function InventoryLink(props) {
    return <Link to="/inventory/" {...props} />;
}
